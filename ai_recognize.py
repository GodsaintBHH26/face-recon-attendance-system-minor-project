import sys
import os
import cv2
import json
import csv
import warnings
warnings.filterwarnings('ignore')
from datetime import datetime
import numpy as np
from insightface.app import FaceAnalysis

DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
REPORT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance_report.csv")

# Model configuration from environment (defaults to local buffalo_s ONNX CPU model)
MODEL_NAME = os.environ.get("FACE_MODEL_NAME", "buffalo_s")
SIMILARITY_THRESHOLD = float(os.environ.get("FACE_SIMILARITY_THRESHOLD", "0.4"))

def compute_cosine_similarity(vec1, vec2):
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vec1, vec2) / (norm1 * norm2))

def log_attendance(name):
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    file_exists = os.path.isfile(REPORT_PATH)
    
    clean_name = name.replace("_", " ").strip()
    # Check if already marked today
    already_marked = False
    if file_exists:
        try:
            with open(REPORT_PATH, mode="r", newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                for row in reader:
                    if len(row) >= 2:
                        existing_name = row[0].replace("_", " ").strip()
                        if existing_name.lower() == clean_name.lower() and row[1].strip() == date_str:
                            already_marked = True
                            break
        except Exception:
            pass
            
    if not already_marked:
        with open(REPORT_PATH, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Student Name", "Date", "Time", "Status"])
            writer.writerow([clean_name, date_str, time_str, "Present"])
    return not already_marked, time_str

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        return

    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"success": False, "error": f"Image file not found: {img_path}"}))
        return

    # Initialize FaceAnalysis on CPU
    app = FaceAnalysis(name=MODEL_NAME)
    app.prepare(ctx_id=-1, det_size=(640, 640))

    # Load known embeddings
    known_embeddings = {}
    if os.path.exists(DATASET_DIR):
        for filename in os.listdir(DATASET_DIR):
            if filename.lower().endswith((".jpg", ".jpeg", ".png")):
                student_name = os.path.splitext(filename)[0]
                full_path = os.path.join(DATASET_DIR, filename)
                ref_img = cv2.imread(full_path)
                if ref_img is not None:
                    faces = app.get(ref_img)
                    if len(faces) > 0:
                        known_embeddings[student_name] = faces[0].embedding

    # Read input image
    input_img = cv2.imread(img_path)
    if input_img is None:
        print(json.dumps({"success": False, "error": "Failed to decode input image"}))
        return

    detected_faces = app.get(input_img)
    results = []

    for face in detected_faces:
        bbox = face.bbox.astype(int).tolist()
        live_embedding = face.embedding

        best_match_name = "Unknown"
        highest_similarity = 0.0

        for name, ref_emb in known_embeddings.items():
            sim = compute_cosine_similarity(ref_emb, live_embedding)
            if sim > highest_similarity:
                highest_similarity = sim
                best_match_name = name

        matched = highest_similarity > SIMILARITY_THRESHOLD
        was_logged = False
        timestamp = ""
        if matched:
            was_logged, timestamp = log_attendance(best_match_name)

        results.append({
            "name": best_match_name if matched else "Unknown",
            "matched": matched,
            "similarity": round(float(highest_similarity), 3),
            "bbox": bbox,
            "logged": was_logged,
            "time": timestamp
        })

    print(json.dumps({
        "success": True,
        "faces_detected": len(detected_faces),
        "results": results
    }))

if __name__ == "__main__":
    main()
