import pytesseract
import cv2
from insightface.app import FaceAnalysis

app = FaceAnalysis(name = "buffalo_sc" , providers = ["CPUExecutionProvider"])

config_mrz = config_mrz = (
    '--tessdata-dir "ml_engine/tessdata" '
    "-l mrz --oem 1 --psm 6 "
    "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789< "
    "-c preserve_interword_spaces=0"
)

class FaceNotFound(Exception):
    pass



def extractMRZ(image) -> str:
    
    x = pytesseract.image_to_string(image , config = config_mrz)
    
    print(x)
    
    return x

def extractImageEmbed(image):
    
    image = cv2.cvtColor(image , cv2.COLOR_BGR2RGB)
    
    faces = app.get(image)
    
    if faces := app.get(image):
        primary_face = max(faces , key = lambda f :(f.bbox[2] - f.bbox[0])*(f.bbox[3] - f.bbox[1]))
    else:    
        raise FaceNotFound("No Face found in the image")
    
    return primary_face.normed_embedding
    
    
    
    
    
    
    
    
    