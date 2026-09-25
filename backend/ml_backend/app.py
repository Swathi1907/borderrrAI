from fastapi import FastAPI , Header , HTTPException
from pydantic import BaseModel, field_validator
from typing import Union
import base64
import cv2
import numpy as np
from ml_engine.module_1.preprocessor import preprocess_passport , preprocess_visa
from ml_engine.module_1 import extractor
from ml_engine.module_2 import validator


app = FastAPI()

class ImagePayload(BaseModel):
    image_base64 : str


    @field_validator('image_base64')
    def validate_base64(cls , v):
        
        if "data:image" in v:
            v = v.split(',')[1]
        return v
        
class Response(BaseModel):
    status : int

class PassPortResponse(Response):
    mrz_validity : bool
    face_validity: bool
    surname : str
    country : str
    name : str
    document_type : str

class VisaResponse(Response):
    mrz_validity : bool
    face_validity: bool
    surname : str
    country : str
    name : str
    
    
    
def decode_base64(imgb64):
    img_bytes = base64.b64decode(imgb64)
    img_arr = np.frombuffer(img_bytes , dtype= np.uint8)
        
    return cv2.imdecode(img_arr , flags = cv2.IMREAD_COLOR)


            
@app.post("/predict" , response_model = Union[VisaResponse,PassPortResponse , Response])
def predict(passPortPayload : ImagePayload ,
            visaPayload: ImagePayload,
            liveImagePayload : ImagePayload,
            doc_id : int = Header(...),
            request_id : int = Header(...)):
    
    
    passport = decode_base64(passPortPayload.image_base64)
    visa = decode_base64(visaPayload.image_base64)
    livePhoto = decode_base64(liveImagePayload.image_base64)
    
    if doc_id not in [1,2,3]: 
            raise HTTPException(status_code = 400)
    
    elif doc_id == 1:
        return Response(status=200)
    
    elif doc_id == 2:
        print("[+] Starting preprocessing for visa... ")
        
        mrz , img_roi = preprocess_visa(img = visa , r_id = request_id)
        
        MRZ = extractor.extractMRZ(mrz)
        
        true_embed = extractor.extractImageEmbed(img_roi)
        live_embed = extractor.extractImageEmbed(livePhoto)
        
        mrz_status = validator.validate_visa(mrz_text = MRZ)
        face_status = validator.validate_faces(true_embed , live_embed)
        
        if mrz_status["status"] and face_status["status"]: 
            return VisaResponse(
                status = 200,
                mrz_validity = mrz_status["status"], 
                face_validity = face_status["face_check"],
                surname = mrz_status["surname"],
                country= mrz_status["country"],
                name = mrz_status["name"]
            )
        
        return Response(status = 400)

        
    
    elif doc_id == 3:
        print("[+] Starting preprocessing for passport... ")
        
        img_roi, mrz = preprocess_passport(img = passport , r_id=request_id)
        
        MRZ = extractor.extractMRZ(mrz)
        
        true_embed = extractor.extractImageEmbed(img_roi)
        live_embed = extractor.extractImageEmbed(livePhoto)
        
        mrz_status = validator.validate_mrz(mrz = MRZ)
        face_status = validator.validate_faces(true_embed , live_embed)
        
        if mrz_status["status"] and face_status["status"]: 
            return PassPortResponse(
                status = 200,
                mrz_validity = mrz_status["status"], 
                face_validity = face_status["face_check"],
                surname = mrz_status["surname"],
                country= mrz_status["country"],
                name = mrz_status["name"],
                document_type = "PASSPORT"
            )
            
        return Response(status = 400)

    
        
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)  