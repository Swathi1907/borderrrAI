import argparse
import base64
from pathlib import Path
import sys
import time
import requests


def encode_image_to_base64(image_path: str | Path) -> str:
    """Encodes a local disk image into a clean base64 UTF-8 string."""
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    with open(path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")


def send_prediction_request(
    passport_b64: str,
    visa_b64: str,
    live_b64: str,
    doc_id: int,
    request_id: int,
    url: str,
) -> None:
    """Dispatches a single POST request matching the FastAPI schema."""
    doc_type_label = "Visa (doc_id=2)" if doc_id == 2 else "Passport (doc_id=3)"
    print(f"\n================ Running Request for {doc_type_label} ================")

    payload = {
        "passPortPayload": {"image_base64": passport_b64},
        "visaPayload": {"image_base64": visa_b64},
        "liveImagePayload": {"image_base64": live_b64},
    }

    headers = {
        "doc-id": str(doc_id),
        "request-id": str(request_id),
        "Content-Type": "application/json",
    }

    start_time = time.perf_counter()
    try:
        response = requests.post(url, json=payload, headers=headers)
        elapsed_time = (time.perf_counter() - start_time) * 1000

        print(f"HTTP Status Code : {response.status_code}")
        print(f"Client Round-Trip: {elapsed_time:.2f} ms")
        print(f"Server Elapsed   : {response.elapsed.total_seconds() * 1000:.2f} ms")

        try:
            res_json = response.json()
            print("Response JSON:")
            for k, v in res_json.items():
                print(f"  {k}: {v}")
        except Exception:
            print("Response Text:")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print(f"[!] Connection failed. Ensure the server is listening at {url}")


def run_dual_test(
    passport_path: str,
    visa_path: str,
    face_path: str,
    url: str = "http://127.0.0.1:8000/predict",
    start_req_id: int = 100,
) -> None:
    """Loads all three files and performs two back-to-back requests (Visa and Passport)."""
    print(f"Encoding Passport: '{passport_path}'")
    passport_b64 = encode_image_to_base64(passport_path)

    print(f"Encoding Visa    : '{visa_path}'")
    visa_b64 = encode_image_to_base64(visa_path)

    print(f"Encoding Face    : '{face_path}'")
    face_b64 = encode_image_to_base64(face_path)

    # 1. First Request: Test Visa Pipeline (doc-id: 2)
    send_prediction_request(
        passport_b64=passport_b64,
        visa_b64=visa_b64,
        live_b64=face_b64,
        doc_id=2,
        request_id=start_req_id,
        url=url,
    )

    # 2. Second Request: Test Passport Pipeline (doc-id: 3)
    send_prediction_request(
        passport_b64=passport_b64,
        visa_b64=visa_b64,
        live_b64=face_b64,
        doc_id=3,
        request_id=start_req_id + 1,
        url=url,
    )


if __name__ == "__main__":
    # Positional CLI inputs in strict sequence: passport, visa, face
    parser = argparse.ArgumentParser(
        description="Run dual verification requests (Visa and Passport) sequentially."
    )
    parser.add_argument(
        "passport",
        nargs="?",
        default="passport.png",
        help="Path to passport image (1st argument)",
    )
    parser.add_argument(
        "visa",
        nargs="?",
        default="visa.png",
        help="Path to visa image (2nd argument)",
    )
    parser.add_argument(
        "face",
        nargs="?",
        default="my_face.jpg",
        help="Path to live portrait image (3rd argument)",
    )
    parser.add_argument(
        "--url",
        type=str,
        default="http://127.0.0.1:8000/predict",
        help="FastAPI /predict endpoint URL",
    )
    parser.add_argument(
        "--req-id",
        type=int,
        default=101,
        help="Starting request ID",
    )

    args = parser.parse_args()

    run_dual_test(
        passport_path=args.passport,
        visa_path=args.visa,
        face_path=args.face,
        url=args.url,
        start_req_id=args.req_id,
    )