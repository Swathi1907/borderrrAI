from mrz.checker.td3 import TD3CodeChecker
from mrz.checker.mrva import MRVACodeChecker
from mrz.checker.mrvb import MRVBCodeChecker
import numpy as np
import re

class invalidPassport(Exception):
    pass

def sanitize_td3_mrz(mrz_text: str) -> str:
    lines = [line.strip().replace(" ", "") for line in mrz_text.strip().splitlines() if line.strip()]
    if len(lines) < 2:
        return mrz_text

    l1 = lines[0][:44]
    l2 = lines[1][:44]

    # Fix country code (indices 10:13) in line 2 if read as '0' instead of 'O'
    if len(l2) >= 13:
        country_part = l2[10:13].replace('0', 'O')
        l2 = l2[:10] + country_part + l2[13:]

    return f"{l1}\n{l2}"

def sanitize_visa_mrz(ocr_text: str) -> tuple[str, str]:
    """
    Sanitizes a two-line OCR MRZ text string and formats it into strict fixed-length lines:
      - MRV-A: 44 characters per line
      - MRV-B: 36 characters per line
    
    Normalizes OCR character confusions:
      - Line 1: Issuing state code (indices 2 to 4) -> Alpha [A-Z]
      - Line 2: Document check digit (index 9) -> Numeric [0-9]
      - Line 2: Nationality code (indices 10 to 12) -> Alpha [A-Z]
      - Line 2: Birth date check digit (index 19) -> Numeric [0-9]
      - Line 2: Expiry date check digit (index 27) -> Numeric [0-9]
    """
    if not isinstance(ocr_text, str):
        raise ValueError("Expected ocr_text to be a string.")

    # Clean lines and remove non-ICAO characters
    raw_lines = ocr_text.strip().splitlines()
    cleaned = []
    for line in raw_lines:
        line_clean = line.replace(" ", "").replace(">", "<")
        line_clean = re.sub(r"[^A-Z0-9<]", "", line_clean)
        if len(line_clean) > 15:
            cleaned.append(line_clean)

    if len(cleaned) < 2:
        raise ValueError(f"Failed to isolate 2 valid MRZ lines. Extracted: {cleaned}")

    # Determine whether format is MRV-A (44 chars) or MRV-B (36 chars)
    target_len = 44 if len(cleaned[0]) >= 40 else 36
    line1 = cleaned[0].ljust(target_len, "<")[:target_len]
    line2 = cleaned[1].ljust(target_len, "<")[:target_len]

    # Character confusion replacement dictionaries
    digit_to_alpha = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B"}
    alpha_to_digit = {"O": "0", "D": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "B": "8"}

    # -------------------------------------------------------------------------
    # Sanitize Line 1:
    # Indices 2 to 4: Issuing State 3-letter alpha code (e.g. V<UTO...)
    # -------------------------------------------------------------------------
    l1_chars = list(line1)
    if len(l1_chars) >= 5:
        for idx in range(2, 5):
            if l1_chars[idx] in digit_to_alpha:
                l1_chars[idx] = digit_to_alpha[l1_chars[idx]]
        line1 = "".join(l1_chars)

    # -------------------------------------------------------------------------
    # Sanitize Line 2:
    # -------------------------------------------------------------------------
    l2_chars = list(line2)
    if len(l2_chars) >= 28:
        # Index 9: Check digit for document number (MUST be numeric)
        if l2_chars[9] in alpha_to_digit:
            l2_chars[9] = alpha_to_digit[l2_chars[9]]

        # Indices 10 to 12: 3-letter Nationality / Country Code (MUST be alpha)
        for idx in range(10, 13):
            if l2_chars[idx] in digit_to_alpha:
                l2_chars[idx] = digit_to_alpha[l2_chars[idx]]

        # Index 19: Check digit for Date of Birth (MUST be numeric)
        if l2_chars[19] in alpha_to_digit:
            l2_chars[19] = alpha_to_digit[l2_chars[19]]

        # Index 27: Check digit for Expiry Date (MUST be numeric)
        if l2_chars[27] in alpha_to_digit:
            l2_chars[27] = alpha_to_digit[l2_chars[27]]

        line2 = "".join(l2_chars)

    return line1, line2


def validate_visa(mrz_text: str) -> dict:
    """
    Parses and verifies check digits for MRV-A (44-char) and MRV-B (36-char) formats
    from a two-line string using the Python `mrz` package.
    """
    try:
        line1, line2 = sanitize_visa_mrz(mrz_text)
        mrz_raw = f"{line1}\n{line2}"

        # Select MRV-A or MRV-B checker based on sanitized line length
        checker = MRVACodeChecker(mrz_raw) if len(line1) == 44 else MRVBCodeChecker(mrz_raw)

        is_valid = bool(checker)
        fields = checker.fields()

        return {
            "status": is_valid,
            "format": "MRV-A" if len(line1) == 44 else "MRV-B",
            "name": getattr(fields, "name", ""),
            "surname": getattr(fields, "surname", ""),
            "country": getattr(fields, "country", ""),
            "nationality": getattr(fields, "nationality", ""),
            "document_number": getattr(checker, "document_number", ""),
            "birth_date": getattr(checker, "birth_date", ""),
            "expiry_date": getattr(checker, "expiry_date", ""),
            "report_warnings": checker.report.warnings if not is_valid else []
        }
    except Exception as e:
        return {
            "status": False,
            "error": str(e)
        }
    

def validate_mrz(mrz : str) -> dict:
    
    try:
        checker = TD3CodeChecker(sanitize_td3_mrz(mrz))
    except Exception as e:
        return {
            "status" : False
        }
    
    
    
    if bool(checker):
        fields = checker.fields()
        return {
            "status" : True,
            "name" : fields.name,
            "surname" : fields.surname,
            "country" : fields.country,
            "nationality" : fields.nationality,
            "expiry_date" : checker.expiry_date
        }
   
    return {
        "status" : False
    }

def validate_faces(true_embed , pass_embed, threshold = 0.65):
    
    try:
        similarity = float(np.dot(true_embed , pass_embed))
    except Exception as e:
        return {
            "status" : False
        }
    
    return {
        "status" : True,
        "face_check" : (similarity > threshold)
    }
        