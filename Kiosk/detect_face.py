import threading
import time
import cv2
from insightface.app import FaceAnalysis

class DetectFace:
    # Sent the camera instance as the input here
    def __init__(self, min_score=0.6, every_n=0.06, det_size=(320, 320)):
        self.app=FaceAnalysis(name="buffalo_l", allowed_modules=["detection"], providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=-1, det_size=det_size)
        self.min_score=min_score
        
        self.latest_frame=None
        self.has_new_frame=False
        self.cooldown=every_n           # The interval between the frames that are taken to be scanned by the model
        
        self.faceV=None                # Stores the drawn data in faceV
        self.lock=threading.Lock()
        self.running=True
        
        # Creating a thread to distribute the workload and improve the performance of the application
        self.thread= threading.Thread(target=self._worker, daemon=True)
        self.thread.start() 
    
    
    def _worker(self):
            while self.running:
                with self.lock:
                    if not self.has_new_frame or self.latest_frame is None:
                        frame=None
                    else:
                        frame=self.latest_frame.copy()
                        self.has_new_frame = False
                        
                if frame is None:
                    time.sleep(0.01)
                    continue
                
                faces = [f for f in self.app.get(frame) if f.det_score > self.min_score]
                best_face=max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])* (f.bbox[3]-f.bbox[1]), default=None)
                
                with self.lock:
                    self.faceV=best_face
                
                if self.cooldown > 0:
                    time.sleep(self.cooldown)
                
    def detect(self, frame):
        with self.lock:
            self.latest_frame=frame
            self.has_new_frame=True 
        
        self.draw(frame=frame, faceV=self.faceV)
        return frame
    
        
    def draw(self, frame, faceV):
        if faceV is None:
            return
        bbox=faceV.bbox.astype(int)
        cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (225, 255, 0), 2)
        cv2.putText(frame, f"{faceV.det_score:.2f}", (bbox[0], bbox[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (245, 200, 0), 2)
              
    def stop(self):
        self.running=False        
            
    
            