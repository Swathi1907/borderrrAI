from pathlib import Path
import sys
import cv2
import numpy as np
from mrz.generator.td3 import TD3CodeGenerator
from mrz.generator.mrvb import MRVBCodeGenerator



def generate_td3_lines() -> tuple[str, str]:
    """
    Generates a 2-line x 44-character ICAO Doc 9303 TD3 compliant MRZ for passports.
    """
    generator = TD3CodeGenerator(
        document_type="P",
        country_code="UTO",
        surname="ERIKSSON",
        given_names="ANNA MARIA",
        document_number="L898902C3",   # Clean alphanumeric, no '<'
        nationality="UTO",
        birth_date="740812",
        sex="F",
        expiry_date="240415",
        optional_data="ZE184226B",     # TD3 allows up to 14 characters
    )
    lines = str(generator).strip().split("\n")
    return lines[0], lines[1]


def generate_mrvb_lines() -> tuple[str, str]:
    """
    Generates a 2-line x 36-character ICAO Doc 9303 Part 7 (MRV-B) compliant MRZ for visas.
    """
    generator = MRVBCodeGenerator(
        document_type="V",
        country_code="UTO",
        surname="ERIKSSON",
        given_names="ANNA MARIA",
        document_number="V1234567",     # Clean alphanumeric, max 9 chars (no '<')
        nationality="UTO",
        birth_date="740812",            # YYMMDD
        sex="F",
        expiry_date="260925",           # YYMMDD
        optional_data="L898902C"        # Max 8 characters for MRV-B (no '<' needed)
    )
    lines = str(generator).strip().split("\n")
    return lines[0], lines[1]


# -----------------------------------------------------------------------------
# 2. Synthetic Passport Generator
# -----------------------------------------------------------------------------

def create_passport_with_contours(
    photo_path: str | None = None, 
    output_path: str = "passport.png"
):
    """
    Renders an open 2-page passport spread simulating flatbed scanner intake.
    Standard TD3 booklet with lower biodata page and top observation page.
    """
    line1, line2 = generate_td3_lines()

    # Total Canvas (scanner margin)
    canvas_w, canvas_h = 1600, 2200
    doc_w, doc_h = 1476, 2079
    margin_x = (canvas_w - doc_w) // 2
    margin_y = (canvas_h - doc_h) // 2

    # Background surface (Scanner bed)
    img = np.full((canvas_h, canvas_w, 3), 180, dtype=np.uint8)

    p_x1, p_y1 = margin_x, margin_y
    p_x2, p_y2 = margin_x + doc_w, margin_y + doc_h

    # Booklet base
    cv2.rectangle(img, (p_x1, p_y1), (p_x2, p_y2), (245, 245, 245), -1)
    cv2.rectangle(img, (p_x1, p_y1), (p_x2, p_y2), (30, 30, 30), thickness=4)

    # Spine seam (Bisects spread into top observation and bottom biodata pages)
    spine_y = p_y1 + (doc_h // 2)
    cv2.line(img, (p_x1, spine_y), (p_x2, spine_y), (100, 100, 100), thickness=3)

    # Top Page (Observations / Visas)
    cv2.rectangle(img, (p_x1 + 60, p_y1 + 60), (p_x2 - 60, spine_y - 60), (230, 230, 230), -1)
    cv2.putText(
        img,
        "TOP PAGE (OBSERVATIONS / VISAS)",
        (p_x1 + 380, p_y1 + 500),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (150, 150, 150),
        2,
        cv2.LINE_AA,
    )

    # Portrait Photo (Anchored on Left for TD3 Passports)
    photo_x = p_x1 + 80
    photo_y = spine_y + 120
    target_w, target_h = 400, 520

    photo_loaded = False
    if photo_path and Path(photo_path).is_file():
        user_photo = cv2.imread(photo_path)
        if user_photo is not None:
            resized_face = cv2.resize(user_photo, (target_w, target_h), interpolation=cv2.INTER_AREA)
            img[photo_y : photo_y + target_h, photo_x : photo_x + target_w] = resized_face
            photo_loaded = True

    if not photo_loaded:
        cv2.rectangle(img, (photo_x, photo_y), (photo_x + target_w, photo_y + target_h), (215, 215, 215), -1)
        cv2.putText(
            img,
            "PHOTO",
            (photo_x + 130, photo_y + 270),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (130, 130, 130),
            2,
            cv2.LINE_AA,
        )

    cv2.rectangle(img, (photo_x, photo_y), (photo_x + target_w, photo_y + target_h), (160, 160, 160), thickness=2)

    # VIZ Text Fields
    field_y = spine_y + 170
    fields = [
        "Type: P",
        "Code: UTO",
        "Passport No: L898902C3",
        "Surname: ERIKSSON",
        "Given Names: ANNA MARIA",
        "Nationality: UTO",
    ]
    for field in fields:
        cv2.putText(img, field, (p_x1 + 540, field_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (60, 60, 60), 2, cv2.LINE_AA)
        field_y += 75

    # MRZ Box (Bottom 20-25%)
    mrz_x1 = p_x1 + 40
    mrz_y1 = p_y2 - 340
    mrz_x2 = p_x2 - 40
    mrz_y2 = p_y2 - 40

    cv2.rectangle(img, (mrz_x1, mrz_y1), (mrz_x2, mrz_y2), (255, 255, 255), -1)
    cv2.rectangle(img, (mrz_x1, mrz_y1), (mrz_x2, mrz_y2), (20, 20, 20), thickness=3)

    cv2.putText(img, line1, (mrz_x1 + 35, mrz_y1 + 120), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (0, 0, 0), 2, cv2.LINE_AA)
    cv2.putText(img, line2, (mrz_x1 + 35, mrz_y1 + 240), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (0, 0, 0), 2, cv2.LINE_AA)

    cv2.imwrite(output_path, img)
    print(f"[+] Saved synthetic passport to {output_path}")


# -----------------------------------------------------------------------------
# 3. Synthetic Visa Generator
# -----------------------------------------------------------------------------

def create_visa_with_contours(
    photo_path: str | None = None, 
    output_path: str = "visa.png"
):
    """
    Renders a synthetic machine-readable visa sticker affixed to a passport page canvas.
    Standard MRV-B aspect ratio is ~1.419 (nominal 105mm x 74mm).
    """
    line1, line2 = generate_mrvb_lines()

    # Canvas Setup
    canvas_w, canvas_h = 1600, 1200
    img = np.full((canvas_h, canvas_w, 3), 215, dtype=np.uint8)

    # Visa Foil Dimensions (MRV-B / TD2 Aspect Ratio ≈ 1.419)
    doc_w, doc_h = 1250, 880
    v_x1 = (canvas_w - doc_w) // 2
    v_y1 = (canvas_h - doc_h) // 2
    v_x2 = v_x1 + doc_w
    v_y2 = v_y1 + doc_h

    # Security Foil Base Color
    cv2.rectangle(img, (v_x1, v_y1), (v_x2, v_y2), (242, 248, 240), -1)
    cv2.rectangle(img, (v_x1, v_y1), (v_x2, v_y2), (40, 40, 40), thickness=3)

    # Header Security Strip
    cv2.rectangle(img, (v_x1 + 10, v_y1 + 10), (v_x2 - 10, v_y1 + 90), (220, 235, 225), -1)
    cv2.putText(
        img,
        "SCHENGEN VISA / VISA DE SEJOUR",
        (v_x1 + 40, v_y1 + 60),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.1,
        (40, 70, 50),
        2,
        cv2.LINE_AA,
    )

    # Photo Placement (Anchored on the RIGHT for Visas)
    target_w, target_h = 280, 360
    photo_x = v_x2 - target_w - 40
    photo_y = v_y1 + 120

    photo_loaded = False
    if photo_path and Path(photo_path).is_file():
        user_photo = cv2.imread(photo_path)
        if user_photo is not None:
            resized_face = cv2.resize(user_photo, (target_w, target_h), interpolation=cv2.INTER_AREA)
            img[photo_y : photo_y + target_h, photo_x : photo_x + target_w] = resized_face
            photo_loaded = True

    if not photo_loaded:
        cv2.rectangle(img, (photo_x, photo_y), (photo_x + target_w, photo_y + target_h), (210, 210, 210), -1)
        cv2.putText(
            img,
            "PHOTO",
            (photo_x + 85, photo_y + 190),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (110, 110, 110),
            2,
            cv2.LINE_AA,
        )

    cv2.rectangle(img, (photo_x, photo_y), (photo_x + target_w, photo_y + target_h), (160, 160, 160), thickness=2)

    # Consular Stamp Simulation
    stamp_center = (v_x1 + 180, v_y1 + 470)
    cv2.circle(img, stamp_center, 90, (180, 50, 40), thickness=3)
    cv2.circle(img, stamp_center, 65, (180, 50, 40), thickness=1)
    cv2.putText(
        img,
        "CONSULAR POST",
        (stamp_center[0] - 60, stamp_center[1] + 5),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (180, 50, 40),
        1,
        cv2.LINE_AA,
    )

    # VIZ Text Fields
    viz_fields = [
        "VALID FOR / VALABLE POUR: UTOPISCHE STAATEN",
        "FROM / DU: 15-04-2024    UNTIL / AU: 25-09-2026",
        "NUMBER OF ENTRIES: MULT",
        "DURATION OF STAY: 90 DAYS",
        "TYPE OF VISA: C (TOURIST)",
        "PASSPORT NO: L898902C3",
        "NAME: ERIKSSON, ANNA MARIA",
    ]

    field_y = v_y1 + 140
    for field in viz_fields:
        cv2.putText(img, field, (v_x1 + 40, field_y), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (45, 45, 45), 2, cv2.LINE_AA)
        field_y += 50

    # MRZ Box (Bottom ~26%)
    mrz_x1 = v_x1 + 25
    mrz_y1 = v_y2 - 220
    mrz_x2 = v_x2 - 25
    mrz_y2 = v_y2 - 25

    cv2.rectangle(img, (mrz_x1, mrz_y1), (mrz_x2, mrz_y2), (255, 255, 255), -1)
    cv2.rectangle(img, (mrz_x1, mrz_y1), (mrz_x2, mrz_y2), (30, 30, 30), thickness=2)

    cv2.putText(img, line1, (mrz_x1 + 35, mrz_y1 + 75), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (0, 0, 0), 2, cv2.LINE_AA)
    cv2.putText(img, line2, (mrz_x1 + 35, mrz_y1 + 155), cv2.FONT_HERSHEY_SIMPLEX, 1.05, (0, 0, 0), 2, cv2.LINE_AA)

    cv2.imwrite(output_path, img)
    print(f"[+] Saved synthetic visa foil to {output_path}")


# -----------------------------------------------------------------------------
# 4. Entrypoint
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    input_face = sys.argv[1] if len(sys.argv) > 1 else None
    
    create_passport_with_contours(photo_path=input_face, output_path="passport.png")
    create_visa_with_contours(photo_path=input_face, output_path="visa.png")