import sys
import os
import json
import warnings
warnings.filterwarnings('ignore')
import cv2
from insightface.app import FaceAnalysis

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image path provided"}))
        return

    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        print(json.dumps({"success": False, "error": f"Image not found: {img_path}"}))
        return

    img = cv2.imread(img_path)
    if img is None:
        print(json.dumps({"success": False, "error": "Could not read image"}))
        return

    app = FaceAnalysis(name="buffalo_s")
    app.prepare(ctx_id=-1, det_size=(640, 640))

    faces = app.get(img)
    if len(faces) == 0:
        print(json.dumps({"success": False, "error": "No face detected in image"}))
        return

    # 512-dimensional embedding
    embedding = faces[0].embedding.tolist()
    bbox = faces[0].bbox.astype(int).tolist()

    print(json.dumps({
        "success": True,
        "embedding": embedding,
        "bbox": bbox,
        "dimension": len(embedding)
    }))

if __name__ == "__main__":
    main()

