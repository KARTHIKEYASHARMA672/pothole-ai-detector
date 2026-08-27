export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface PotholeDetection {
  confidence: number;
  confidence_percentage: number;
  label: string;
  bbox: BoundingBox;
}

export interface DetectionResponse {
  status: string;
  detected: boolean;
  num_potholes: number;
  confidence_scores: number[];
  max_confidence: number;
  avg_confidence: number;
  max_confidence_percentage: number;
  annotated_image: string | null;
  original_image: string;
  inference_time_ms: number;
  detections: PotholeDetection[];
  model_source: string;
}

export interface BackendHealth {
  status: string;
  service: string;
  model_path: string;
  model_file_exists: boolean;
  model_loaded: boolean;
  error?: string | null;
}
