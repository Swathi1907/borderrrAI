import cv2
import numpy as np
import re

import os

# Aspect ratio definitions (ICAO Doc 9303 Part 7)
VISA_MRVB_RATIO = 105.0 / 74.0   # ≈ 1.4189 (MRV-B / TD2 equivalent)
VISA_MRVA_RATIO = 125.0 / 88.0   # ≈ 1.4205 (MRV-A / TD3 equivalent)

os.environ["TESSDATA_PREFIX"] = "ml_engine/tessdata"

class InvalidVisaImage(Exception):
    pass

class NoContourFound(Exception):
    pass

class InvalidImage(Exception):
    pass

class unknownShape(Exception):
    pass

config_mrz = (
    '--tessdata-dir "ml_engine/tessdata" '
    "-l mrz --oem 1 --psm 6 "
    "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< "
    "-c preserve_interword_spaces=0"
)

def order_points(pts):
    """
    Orders 4 points in the exact order: top-left, top-right, bottom-right, bottom-left.
    Expects an array of shape (4, 2).
    """
    rect = np.zeros((4, 2), dtype="float32")
    
    # Top-left point has the smallest sum, bottom-right has the largest sum
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Top-right point has the smallest difference, bottom-left has the largest difference
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def perspective_transform(image, contour):
    """
    Applies a top-down birds-eye view transformation given a 4-point contour.
    """
    # Reshape the contour to a (4, 2) array of coordinates
    pts = contour.reshape(4, 2)
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute the width of the new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Compute the height of the new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    # Define the destination points for the top-down view
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    # Compute the perspective transform matrix and warp the image
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))

def correct_orientation(img) :

    if len(img.shape) < 2:
        raise unknownShape("img array has less than 2 dimensions")
    
    h , w = img.shape[:2]
    
    if w > h:
        print("[+] Image is horizontal, rotating it 90 degrees clockwise")
        return correct_orientation(cv2.rotate(img , cv2.ROTATE_90_CLOCKWISE))
    
    top_strip = img[: int(h*0.20), :]
    bot_strip = img[int(h*0.80) : , :]
    
    top_energy = np.mean(np.abs(cv2.Sobel(top_strip , cv2.CV_32F , 1 , 0 , ksize=3)))
    bot_energy = np.mean(np.abs(cv2.Sobel(bot_strip , cv2.CV_32F, 1 , 0 , ksize =3)))
    
    if top_energy > bot_energy:
        print("[+] Image is upside down rotating it one 180 degree ")
        
        return cv2.rotate(img , cv2.ROTATE_180)
    
    return img
        

def detect_document_contour(
    img: np.ndarray, 
    target_aspect_ratio: float = 1.475, 
    min_area_ratio: float = 0.10
):
    """
    Detects and returns the single best-matching 4-point document contour from an in-memory image.
    
    Contours are prioritized by bounding area and matched against the target aspect ratio
    (defaulting to ISO/IEC 7810 ID-1 ~ 1.585).
    
    Returns:
        np.ndarray of shape (4, 2) containing ordered corner points, or None if not found.
    """
    
    if img is None or not isinstance(img, np.ndarray):
        raise ValueError("Input 'img' must be a valid numpy array.")
    

    h_img, w_img = img.shape[:2]
    total_area = h_img * w_img
    min_area = total_area * min_area_ratio

    # Handle grayscale or multi-channel arrays
    if len(img.shape) == 2:
        gray = img
    elif img.shape[2] == 4:
        gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Sort contours by area in descending order and filter out minor background noise
    valid_candidates = []
    sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for c in sorted_contours:
        area = cv2.contourArea(c)
        if area < min_area:
            break  # Subsequent contours will be even smaller

        peri = cv2.arcLength(c, closed=True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, closed=True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            pts = approx.reshape(4, 2)
            rect = cv2.minAreaRect(pts)
            (_, _), (width, height), _ = rect
            
            if width == 0 or height == 0:
                continue

            aspect_ratio = max(width,height)/min(height,width)
            ar_diff = abs(aspect_ratio - target_aspect_ratio)
            # Weight score favoring bottom most , high area and low aspect ratio deviation
            valid_candidates.append({
                "contour": pts,
                "center_y" : np.mean(pts[: ,1]),
                "area": area,
                "ar_diff": ar_diff
            })

    if not valid_candidates:
        raise NoContourFound("Did not find a valid countour")

    # Primary sort: lowest aspect ratio deviation; Secondary: highest area
    valid_candidates.sort(key=lambda x: (x["ar_diff"], -x["center_y"],-x["area"]))
    
    return gray , valid_candidates[0]["contour"]

def preprocess_mrz(img_path: str) -> str:
    # Load grayscale directly
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

    # 1. DO NOT apply hard threshold/Otsu. Tesseract's LSTM engine needs grayscale antialiasing.
    # 2. Add clean white padding so edge characters are not clipped
    padded = cv2.copyMakeBorder(
        img, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=255  # type: ignore
    ) 

    # 3. Light normalization to maximize contrast without destroying gradients
    norm = cv2.normalize(padded, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)  # type: ignore

    cv2.imwrite(img_path, norm)
    return img_path


def mrz_roi(img: np.ndarray, r_id: int):
    """Extracts the bottom ~16% of the opened passport document,

    skipping the outer borders to isolate the text lines.
    """
    h_img, w_img = img.shape[:2]

    # For an opened passport (1476x2079), the MRZ zone starts at ~84% height
    # We inset by 60px horizontally and vertically to clear any bounding box borders
    y_start = int(h_img * 0.84)
    y_end = int(h_img * 0.98)
    x_start = int(w_img * 0.04)
    x_end = int(w_img * 0.96)

    return img[y_start:y_end, x_start:x_end]

def photo_roi(img: np.ndarray) -> np.ndarray:
    """Extracts the holder's portrait photo from an opened passport booklet.

    Assumes an upright, perspective-rectified opened passport (H > W).
    """
    h_img, w_img = img.shape[:2]

    # In an opened booklet (top: visa/observations, bottom: biodata):
    # - Vertical span: sits between the booklet midpoint (~54%) and just above the MRZ (~84%)
    # - Horizontal span: anchored on the left margin (~5% to ~38% of width)
    y_start = int(h_img * 0.54)
    y_end = int(h_img * 0.84)
    x_start = int(w_img * 0.05)
    x_end = int(w_img * 0.38)

    return img[y_start:y_end, x_start:x_end]

def detect_visa_contour(
    img: np.ndarray,
    target_aspect_ratio: float = VISA_MRVB_RATIO,
    min_area_ratio: float = 0.05
) -> np.ndarray:
    """
    Locates the 4-corner contour of a visa sticker affixed inside a booklet.
    Matches against standard visa sticker aspect ratios (~1.419).
    """
    if img is None or not isinstance(img, np.ndarray):
        raise InvalidImage("Input image must be a valid non-empty numpy array.")

    h_img, w_img = img.shape[:2]
    total_area = h_img * w_img
    min_area = total_area * min_area_ratio

    if len(img.shape) == 2:
        gray = img
    elif img.shape[2] == 4:
        gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 35, 125)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)

    candidates = []
    for c in sorted_contours:
        area = cv2.contourArea(c)
        if area < min_area:
            break

        peri = cv2.arcLength(c, closed=True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, closed=True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            pts = approx.reshape(4, 2)
            rect = cv2.minAreaRect(pts)
            (_, _), (width, height), _ = rect

            if width == 0 or height == 0:
                continue

            aspect_ratio = max(width, height) / float(min(width, height))
            ar_diff = abs(aspect_ratio - target_aspect_ratio)

            if ar_diff <= 0.22:
                candidates.append({
                    "contour": pts,
                    "area": area,
                    "ar_diff": ar_diff
                })

    if not candidates:
        raise NoContourFound("Could not identify a valid 4-corner visa sticker contour.")

    candidates.sort(key=lambda x: (x["ar_diff"], -x["area"]))
    return candidates[0]["contour"]

def correct_visa_orientation(img: np.ndarray) -> np.ndarray:
    """
    Standardizes orientation for an aligned visa sticker:
    1. Ensures landscape format (Width > Height).
    2. Uses MRZ high-frequency horizontal text density to detect if the document
       is upside down, rotating 180° if needed.
    Does not depend on external Haar cascade models or cv2.CascadeClassifier.
    """
    if img is None or not isinstance(img, np.ndarray) or img.size == 0:
        raise InvalidVisaImage("Input visa image is None or empty.")

    normalized = img.copy()
    h, w = normalized.shape[:2]

    # 1. Enforce Landscape Orientation (Width > Height)
    # Only rotate if the image is in portrait orientation
    if h > w:
        print("[+] Visa is vertical, rotating 90 degrees clockwise to landscape...")
        normalized = cv2.rotate(normalized, cv2.ROTATE_90_CLOCKWISE)
        h, w = normalized.shape[:2]

    # Convert to grayscale for gradient calculation
    if len(normalized.shape) == 3:
        gray = cv2.cvtColor(normalized, cv2.COLOR_BGR2GRAY)
    else:
        gray = normalized

    # 2. Check Top vs. Bottom Edge Density (MRZ is located at the bottom)
    # Vertical derivative (0, 1) captures horizontal text stroke lines in the MRZ
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)

    # Inspect top 25% (header zone) vs bottom 25% (MRZ zone)
    top_band = np.abs(sobel_y[: int(h * 0.25), :])
    bot_band = np.abs(sobel_y[int(h * 0.75) :, :])

    top_energy = float(np.mean(top_band))
    bot_energy = float(np.mean(bot_band))

    # The 2-line MRZ at the bottom produces significantly higher edge density.
    # If the top has higher energy than the bottom, the visa is upside down.
    if top_energy > (bot_energy * 1.25):
        print("[+] Visa is upside down (MRZ detected at top), rotating 180 degrees...")
        normalized = cv2.rotate(normalized, cv2.ROTATE_180)

    return normalized


def visa_mrz_roi(aligned_visa: np.ndarray) -> np.ndarray:
    """
    Extracts the bottom 2-line Machine Readable Zone (MRZ) from a deskewed visa foil.
    Per ICAO Doc 9303 Part 7, MRZ occupies the bottom ~26% of the sticker.
    """
    h, w = aligned_visa.shape[:2]
    y_start = int(h * 0.74)
    return aligned_visa[y_start:h, int(w * 0.02):int(w * 0.98)].copy()


def visa_photo_roi(aligned_visa: np.ndarray) -> np.ndarray:
    """
    Extracts the traveler photo from the visa foil.
    In standard visa layouts, the photo sits on the right side (~64% to 98% of width).
    """
    h, w = aligned_visa.shape[:2]
    return aligned_visa[int(h * 0.15):int(h * 0.74), int(w * 0.64):int(w * 0.98)].copy()

def extract_visa_rois(aligned_visa: np.ndarray) -> dict[str, np.ndarray]:
    """Slices a deskewed visa foil into all functional inspection zones."""
    return {
        "mrz": visa_mrz_roi(aligned_visa),
        "photo": visa_photo_roi(aligned_visa)
    }
    


    
def preprocess_passport(img, r_id : int):
    
    if img is None:
        
        raise InvalidImage("Image given is not a valid image")
    
    grey_img = None
        
    print("[+] Detecting Contour")
    grey_img , contour =  detect_document_contour(img)
    print("[+] Performing prespective transform")
    img = perspective_transform(image = img , contour = contour)
    
    roi_image = photo_roi(img=img)
    
    print("[+] Correcting Orientation")
            
    grey_img = correct_orientation(grey_img)
    
    mrz = mrz_roi(grey_img , r_id)
    
    print("[+] Completed")
    
    return roi_image , mrz

def preprocess_visa(img, r_id : int):
    """
    Complete end-to-end preprocessing pipeline for an input visa image:
    1. Detects the visa sticker boundary contour.
    2. Performs top-down perspective transform.
    3. Normalizes landscape orientation.
    4. Slices MRZ, photo, and VIZ text ROIs.
    """
    if img is None:
        raise InvalidImage("Input visa image is None.")
    
    print("[+] Detecting Contour")
    contour = detect_visa_contour(img)
    print("[+] Performing prespective transform")
    warped = perspective_transform(img, contour)
    print("[+] Correcting Orientation")
    aligned_visa = correct_visa_orientation(warped)
    rois = extract_visa_rois(aligned_visa)
    
    print("[+] Completed")
    
    cv2.imwrite("face.png" , rois["photo"])

    return rois["mrz"],rois["photo"]

if __name__ == "__main__":
    
    img = cv2.imread("image.png")
    
    final_img , _ = preprocess_passport(img = img, r_id = 0)
    
    cv2.imwrite("final_img.png" , final_img)
    
    
    
    



    
    