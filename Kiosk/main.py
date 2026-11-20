import cv2
from detect_face import DetectFace
from camera import Camera


cam=Camera(0)
detector=DetectFace()

try:
    for frame in cam.frames():
        face=detector.detect(frame)
        cv2.imshow("Kiosk", face)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    detector.stop()
    cam.release()
    cv2.destroyAllWindows()