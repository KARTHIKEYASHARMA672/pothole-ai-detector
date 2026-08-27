import os
import io
import time
import base64
import logging
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pothole-detector")

# Initialize FastAPI App
app = FastAPI(
    title="Pothole AI Detector API",
    description="Computer Vision REST API for automated road pothole detection powered by YOLO and FastAPI.",
    version="1.0.0"
)

# CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "best_pothole_model.pt")

yolo_model = None
model_load_error = None

def load_yolo_model():
    """
    Loads the trained YOLO model from the model directory.
    Uses ultralytics YOLO if available and valid.
    """
    global yolo_model, model_load_error
    if not os.path.exists(MODEL_PATH):
        model_load_error = f"Model file not found at {MODEL_PATH}"
        logger.warning(model_load_error)
        return None

    try:
        from ultralytics import YOLO
        logger.info(f"Loading YOLO model from: {MODEL_PATH}")
        yolo_model = YOLO(MODEL_PATH)
        logger.info("Successfully loaded YOLO pothole detection model.")
        model_load_error = None
        return yolo_model
    except Exception as e:
        model_load_error = f"Failed to load YOLO model: {str(e)}"
        logger.error(model_load_error)
        yolo_model = None
        return None

# Load model on startup
@app.on_event("startup")
def startup_event():
    load_yolo_model()

# Data Schemas
class BoundingBox(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float

class PotholeDetection(BaseModel):
    confidence: float
    confidence_percentage: float
    label: str = "pothole"
    bbox: BoundingBox

class DetectionResponse(BaseModel):
    status: str
    detected: bool
    num_potholes: int
    confidence_scores: List[float]
    max_confidence: float
    avg_confidence: float
    max_confidence_percentage: float
    annotated_image: Optional[str] = None
    original_image: str
    inference_time_ms: float
    detections: List[PotholeDetection]
    model_source: str

def image_to_base64(pil_image: Image.Image, format="JPEG") -> str:
    """Converts a PIL Image to a base64 encoded data URI string."""
    buffered = io.BytesIO()
    if pil_image.mode in ("RGBA", "P"):
        pil_image = pil_image.convert("RGB")
    pil_image.save(buffered, format=format, quality=90)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_str}"

@app.get("/")
@app.get("/api/health")
def health_check():
    """Health check and model status endpoint."""
    model_exists = os.path.exists(MODEL_PATH)
    return {
        "status": "online",
        "service": "Pothole AI Detector API",
        "model_path": MODEL_PATH,
        "model_file_exists": model_exists,
        "model_loaded": yolo_model is not None,
        "error": model_load_error
    }

@app.post("/api/detect", response_model=DetectionResponse)
@app.post("/detect", response_model=DetectionResponse)
async def detect_potholes(
    file: UploadFile = File(...),
    confidence_threshold: float = Query(0.25, ge=0.05, le=0.95, description="Confidence threshold for YOLO detection")
):
    """
    Accepts an uploaded road image (JPG, JPEG, PNG, WEBP),
    runs the trained YOLO pothole detection model, and returns
    detection status, bounding boxes, confidence scores, and an annotated image.
    """
    if not file.content_type or not any(file.content_type.startswith(t) for t in ["image/jpeg", "image/png", "image/webp", "image/"]):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a valid JPG, JPEG, or PNG image."
        )

    start_time = time.time()

    # Read uploaded file
    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    img_width, img_height = pil_image.size
    original_base64 = image_to_base64(pil_image)

    detections: List[PotholeDetection] = []
    annotated_base64 = None
    model_source = "YOLO (best_pothole_model.pt)"

    # Run YOLO Model Inference
    if yolo_model is not None:
        try:
            results = yolo_model.predict(
                source=pil_image,
                conf=confidence_threshold,
                save=False,
                verbose=False
            )
            
            if results and len(results) > 0:
                result = results[0]
                boxes = result.boxes
                
                if boxes is not None and len(boxes) > 0:
                    for box in boxes:
                        coords = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]
                        conf = float(box.conf.item())
                        
                        detections.append(
                            PotholeDetection(
                                confidence=round(conf, 4),
                                confidence_percentage=round(conf * 100, 1),
                                label="pothole",
                                bbox=BoundingBox(
                                    xmin=round(coords[0], 2),
                                    ymin=round(coords[1], 2),
                                    xmax=round(coords[2], 2),
                                    ymax=round(coords[3], 2)
                                )
                            )
                        )
                    
                    # Plot annotated image with YOLO bounding boxes
                    annotated_bgr = result.plot()
                    annotated_rgb = Image.fromarray(annotated_bgr[..., ::-1])
                    annotated_base64 = image_to_base64(annotated_rgb)
        except Exception as err:
            logger.error(f"Inference error with YOLO: {err}")
            raise HTTPException(status_code=500, detail=f"Error executing YOLO inference: {str(err)}")
    else:
        # If best_pothole_model.pt is not loaded or is a placeholder,
        # note this clearly in the model_source.
        model_source = "Placeholder (Place weights at backend/model/best_pothole_model.pt)"
        # Return clean no-pothole or sample depending on model file state
        annotated_base64 = None

    # Calculate metrics
    is_detected = len(detections) > 0
    num_potholes = len(detections)
    conf_scores = [d.confidence for d in detections]
    max_conf = max(conf_scores) if conf_scores else 0.0
    avg_conf = round(sum(conf_scores) / len(conf_scores), 4) if conf_scores else 0.0
    max_conf_pct = round(max_conf * 100, 1)

    inference_time = round((time.time() - start_time) * 1000, 2)

    return DetectionResponse(
        status="success",
        detected=is_detected,
        num_potholes=num_potholes,
        confidence_scores=conf_scores,
        max_confidence=max_conf,
        avg_confidence=avg_conf,
        max_confidence_percentage=max_conf_pct,
        annotated_image=annotated_base64 if is_detected else None,
        original_image=original_base64,
        inference_time_ms=inference_time,
        detections=detections,
        model_source=model_source
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
