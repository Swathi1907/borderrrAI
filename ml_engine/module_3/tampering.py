import cv2
import numpy as np


class ForensicTamperDetector:
    def __init__(self, ela_quality: int = 90, sensitivity: float = 2.5):
        self.ela_quality = ela_quality
        self.sensitivity = sensitivity

        # 5x5 SRM high-pass filter: strips semantic text and isolates compression/interpolation noise
        self.srm_kernel = np.array([
            [-1,  2, -2,  2, -1],
            [ 2, -6,  8, -6,  2],
            [-2,  8,-12,  8, -2],
            [ 2, -6,  8, -6,  2],
            [-1,  2, -2,  2, -1]
        ], dtype=np.float32) / 12.0

    def compute_ela_map(self, img_bgr: np.ndarray) -> np.ndarray:
        """Computes Error Level Analysis to expose double-compression artifacts."""
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), self.ela_quality]
        _, encoded = cv2.imencode(".jpg", img_bgr, encode_param)
        resaved = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

        diff = cv2.absdiff(img_bgr, resaved).astype(np.float32)
        gray_diff = cv2.cvtColor(diff.astype(np.uint8), cv2.COLOR_BGR2GRAY)

        scale = 255.0 / (np.max(gray_diff) + 1e-5)
        return cv2.convertScaleAbs(gray_diff, alpha=scale)

    def compute_srm_residuals(self, img_bgr: np.ndarray) -> np.ndarray:
        """Filters high-frequency noise residuals across color channels."""
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
        residuals = cv2.filter2D(gray, -1, self.srm_kernel)
        residuals = np.abs(residuals)
        norm_res = cv2.normalize(residuals, None, 0, 255, cv2.NORM_MINMAX)
        return norm_res.astype(np.uint8)

    def analyze_document(self, img_bgr: np.ndarray, photo_roi: np.ndarray | None = None) -> dict:
        """
        Runs comprehensive forensic screening:
        1. Full-page double compression mapping.
        2. Boundary noise discontinuity check on portrait photo.
        """
        ela_map = self.compute_ela_map(img_bgr)
        srm_map = self.compute_srm_residuals(img_bgr)

        # Fused anomaly heatmap
        fused = cv2.addWeighted(ela_map, 0.6, srm_map, 0.4, 0)
        _, binary_mask = cv2.threshold(fused, 160, 255, cv2.THRESH_BINARY)

        tampered_pixel_ratio = float(np.count_nonzero(binary_mask)) / float(binary_mask.size)

        photo_spliced = False
        if photo_roi is not None and photo_roi.size > 0:
            photo_ela = self.compute_ela_map(photo_roi)
            # Higher residual error inside photo box relative to page background indicates splicing
            photo_err = float(np.mean(photo_ela))
            page_err = float(np.mean(ela_map))
            if photo_err > (page_err * self.sensitivity):
                photo_spliced = True

        is_tampered = (tampered_pixel_ratio > 0.035) or photo_spliced

        return {
            "tampered": is_tampered,
            "photo_spliced": photo_spliced,
            "tamper_ratio": round(tampered_pixel_ratio, 4),
            "heatmap": fused,
            "binary_mask": binary_mask
        }