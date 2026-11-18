import cv2

class Camera:
    def __init__(self, index):
        self.cap=cv2.VideoCapture(index)
        
        # Checking if the camera is opened or not
        if not self.cap.isOpened():
            raise RuntimeError("Could not open the camera.")
        
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        
    def frames(self):
        while True:
            ok, frame = self.cap.read()  # Ok is a boolean variable that indicates whether there is any input coming from the video capture device or not; while frame is the video frame taken from the capture device
            # Break the loop when no more input incoming from the capture device
            if not ok:
                break
            yield frame
            
    def release(self):
        self.cap.release()