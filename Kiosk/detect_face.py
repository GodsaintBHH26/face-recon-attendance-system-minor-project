import cv2
from insightface.app import FaceAnalysis

class DetectFace:
    # Sent the camera instance as the input here
    def __init__(self, min_score=0.6, every_n=3, det_size=(320, 320)):
        self.app=FaceAnalysis(name="buffalo_l", allowed_modules=["detection"], providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=-1, det_size=det_size)
        self.min_score=min_score
        self.every_n=every_n
        self.frame_count=0
        self.faceV=None
        
    def detect(self, frame):
        if self.frame_count % self.every_n == 0:
            faces = [f for f in self.app.get(frame) if f.det_score > self.min_score]
            self.faceV=max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])* (f.bbox[3]-f.bbox[1]), default=None)
        self.frame_count+=1
        self.draw(frame=frame, faceV=self.faceV)
        return frame
    
        
    def draw(self, frame, faceV):
        if faceV is None:
            return
        bbox=faceV.bbox.astype(int)
        cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (225, 255, 0), 2)
        cv2.putText(frame, f"{faceV.det_score:.2f}", (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (245, 200, 0), 2)
              
            
            
    
            