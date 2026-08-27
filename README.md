# 🕳️ Pothole AI Detector

An end-to-end full-stack computer vision web application for detecting road hazards and potholes in real-time. Built with a high-performance **FastAPI** backend running an **Ultralytics YOLO** neural network model, and a **React + TypeScript + Tailwind CSS** frontend dashboard.

---

## 📸 Overview & Features

- **Trained YOLO Object Detection:** Uses `backend/model/best_pothole_model.pt` loaded on server startup.
- **Annotated Visualizations:** Automatically draws bounding boxes and confidence score labels directly onto detected potholes.
- **Clear Result States:**
  - **🕳️ Pothole Detected:** Displays count of detected potholes, highest confidence percentage, inference latency, and the annotated image with YOLO bounding boxes.
  - **✅ No Pothole Detected:** Displays the clean original image and confirms the road surface is clear.
- **Drag-and-Drop Interface:** Easily upload `.jpg`, `.jpeg`, `.png`, or `.webp` road imagery.
- **Interactive Visualizer:** Toggle between the annotated YOLO image and the original image.
- **Adjustable Sensitivity:** Real-time slider to configure detection confidence threshold ($0.10$ to $0.90$).
- **One-Click Sample Images:** Quickly test pothole detection without needing to upload files.

---

## 📁 Project Structure

```text
pothole-detector/
│
├── frontend/                     # React + TypeScript + Tailwind CSS Web App
│   ├── src/
│   │   ├── App.tsx              # Main Dashboard & Computer Vision UI
│   │   ├── index.css            # Tailwind & glassmorphism styling
│   │   ├── main.tsx             # Application entry point
│   │   └── types.ts             # TypeScript interface definitions
│   ├── index.html               # Web template with custom fonts
│   ├── package.json             # NPM dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite bundler configuration
│
├── backend/                      # FastAPI Python Backend
│   ├── main.py                  # FastAPI server & Ultralytics YOLO inference pipeline
│   ├── requirements.txt         # Python dependencies
│   └── model/
│       └── best_pothole_model.pt # Trained YOLO Pothole Detection Model
│
└── README.md                    # Setup & Execution Documentation
```

---

## 🚀 Installation & Setup Guide

### 1. Backend Setup (FastAPI & YOLO)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment (Recommended):**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify the model file:**
   Ensure your trained YOLO weights are placed at:
   ```text
   backend/model/best_pothole_model.pt
   ```

5. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - The backend API will be running at `http://localhost:8000`.
   - Interactive Swagger API docs are accessible at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (React + TypeScript + Tailwind)

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   - The application will be available at `http://localhost:3000` (or the port indicated in your terminal).

---

## 🌐 API Endpoint Documentation

### 1. Health & Model Status Check
- **Endpoint:** `GET /api/health` or `GET /`
- **Response:**
  ```json
  {
    "status": "online",
    "service": "Pothole AI Detector API",
    "model_path": ".../backend/model/best_pothole_model.pt",
    "model_file_exists": true,
    "model_loaded": true,
    "error": null
  }
  ```

---

### 2. Pothole Detection Inference
- **Endpoint:** `POST /api/detect` (or `POST /detect`)
- **Query Parameters:**
  - `confidence_threshold` (optional, float between `0.05` and `0.95`, default: `0.25`)
- **Request Body:**
  - `multipart/form-data` with key `file` (Image: `.jpg`, `.jpeg`, `.png`, `.webp`)
- **Response Format:**
  ```json
  {
    "status": "success",
    "detected": true,
    "num_potholes": 2,
    "confidence_scores": [0.9412, 0.8875],
    "max_confidence": 0.9412,
    "avg_confidence": 0.9144,
    "max_confidence_percentage": 94.1,
    "annotated_image": "data:image/jpeg;base64,...",
    "original_image": "data:image/jpeg;base64,...",
    "inference_time_ms": 38.45,
    "detections": [
      {
        "confidence": 0.9412,
        "confidence_percentage": 94.1,
        "label": "pothole",
        "bbox": {
          "xmin": 120.5,
          "ymin": 340.0,
          "xmax": 280.2,
          "ymax": 490.8
        }
      }
    ],
    "model_source": "YOLO (best_pothole_model.pt)"
  }
  ```

#### Example cURL Request:
```bash
curl -X POST "http://localhost:8000/api/detect?confidence_threshold=0.25" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@road_sample.jpg"
```

---

## 🧠 Technologies Used

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite, Lucide Icons.
- **Backend:** FastAPI, Python 3.10+, Ultralytics YOLO, Uvicorn, Pillow, NumPy.
- **Computer Vision:** YOLOv8 / YOLOv11 PyTorch Object Detection.
