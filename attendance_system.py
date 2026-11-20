import os
import cv2
import numpy as np
import csv
from datetime import datetime
from insightface.app import FaceAnalysis

# 1. Initialize InsightFace
app = FaceAnalysis(name="buffalo_s")
app.prepare(ctx_id=-1, det_size=(640, 640))

# -------------------------------------------------------------
# STEP 1: LOAD ALL STUDENT PHOTOS FROM THE 'dataset' FOLDER
# -------------------------------------------------------------
DATASET_DIR = "dataset"
known_embeddings = {}

if not os.path.exists(DATASET_DIR):
    os.makedirs(DATASET_DIR)
    print(f"Created '{DATASET_DIR}' folder. Please place student photos inside it (e.g., 'Pratyush.jpg').")
    exit()

print("Loading student dataset...")
for filename in os.listdir(DATASET_DIR):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        # Extract student name from filename (e.g., 'Pratyush.jpg' -> 'Pratyush')
        student_name = os.path.splitext(filename)[0]
        img_path = os.path.join(DATASET_DIR, filename)
        
        img = cv2.imread(img_path)
        if img is None:
            print(f"Warning: Could not read image for {student_name}")
            continue
            
        faces = app.get(img)
        if len(faces) > 0:
            # Store the 512-dimensional embedding vector mapped to the student's name
            known_embeddings[student_name] = faces[0].embedding
            print(f" -> Successfully loaded face for: {student_name}")
        else:
            print(f" -> Warning: No face detected in photo for {student_name}")

if len(known_embeddings) == 0:
    print("Error: No valid student face embeddings loaded. Add photos to the 'dataset' folder.")
    exit()

print(f"Total students loaded into memory: {len(known_embeddings)}")

# -------------------------------------------------------------
# STEP 2: CSV ATTENDANCE LOGGING & DUPLICATE PREVENTION SETUP
# -------------------------------------------------------------
marked_students = set()  # Keeps track of who has been logged during this session

def log_attendance(name):
    if name not in marked_students:
        marked_students.add(name)
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M:%S")
        
        file_exists = os.path.isfile("attendance_report.csv")
        with open("attendance_report.csv", mode="a", newline="") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Student Name", "Date", "Time", "Status"])
            writer.writerow([name, date_str, time_str, "Present"])
            
        print(f"[ATTENDANCE RECORDED] {name} at {time_str}")

# -------------------------------------------------------------
# STEP 3: OPEN WEBCAM & MULTI-STUDENT RECOGNITION LOOP
# -------------------------------------------------------------
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

print("\nStarting live multi-student attendance feed. Press 'q' to exit.")

def compute_cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

while True:
    ret, frame = cap.read()
    if not ret:
        break

    live_faces = app.get(frame)

    for face in live_faces:
        bbox = face.bbox.astype(int)
        live_embedding = face.embedding

        best_match_name = "Unknown"
        highest_similarity = 0.0

        # Compare the live face against every student loaded in our dictionary
        for name, ref_embedding in known_embeddings.items():
            similarity = compute_cosine_similarity(ref_embedding, live_embedding)
            if similarity > highest_similarity:
                highest_similarity = similarity
                best_match_name = name

        # Threshold check: If highest match is above 0.4, recognize the student
        if highest_similarity > 0.4:
            label = f"{best_match_name} ({highest_similarity:.2f})"
            box_color = (0, 255, 0)  # Green box for recognized students
            
            # Log attendance and prevent duplicates for this session
            log_attendance(best_match_name)
        else:
            label = f"Unknown ({highest_similarity:.2f})"
            box_color = (0, 0, 255)  # Red box for unrecognized faces

        # Draw box and name tag on the video frame
        cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), box_color, 2)
        cv2.putText(frame, label, (bbox[0], bbox[1] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

    cv2.imshow("Smart Attendance System - Multi-Student", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()