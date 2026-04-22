import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { type Point } from '../engines/GazeEngine';

export const useGaze = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const [gaze, setGaze] = useState<Point>({ x: 0.5, y: 0.5 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHRMode, setIsHRMode] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<any>(null);
  const [irisRatio, setIrisRatio] = useState(0.5);
  const [shoulderSymmetry, setShoulderSymmetry] = useState(1.0);
  const [handVisibility, setHandVisibility] = useState({ left: false, right: false });
  const handDeviationStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const loadModels = async () => {
        if (!window.isSecureContext) {
          console.error("Camera will not work on non-HTTPS connections!");
        }

        const wasmPath = '/models/mediapipe/wasm';
        const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);
        
        // Initialize Face Landmarker (468 landmarks)
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "/models/mediapipe/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        
        // Initialize Pose Landmarker (33 landmarks)
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "/models/mediapipe/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        
        setIsLoaded(true);
        setIsSimulated(false);
      } catch (err) {
        console.error("Critical Model Load Error:", err);
        setError('Model loading failed. Please check your connection.');
        setIsSimulated(true);
        // We do NOT set isLoaded(true) here to prevent entering the tracking loop with null models
      }
    };

    loadModels();

    return () => {
      // Cleanup MediaPipe instances
      faceLandmarkerRef.current = null;
      poseLandmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !videoRef.current) return;

    let animationId: number;
    let isTracking = true;
    let hasLoggedStart = false;

    const startTracking = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user', 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          } 
        });
        if (videoRef.current && isTracking) {
          videoRef.current.srcObject = stream;
          // Explicitly call play() for mobile compatibility
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.error("Video play failed:", playErr);
          }
        }
      } catch (err: any) {
        console.error("Camera access error:", err.name, err.message);
        setError(`Camera access denied: ${err.name}`);
        return;
      }

      const track = async () => {
        if (!isTracking || !videoRef.current || !faceLandmarkerRef.current || !poseLandmarkerRef.current) {
          if (isTracking) animationId = requestAnimationFrame(track);
          return;
        }

        const startTimeMs = performance.now();
        
        // Run both Face Mesh and Pose detection in single loop
        const faceResults = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        const poseResults = poseLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

        if (!hasLoggedStart && (faceResults.faceLandmarks?.length > 0 || poseResults.landmarks?.length > 0)) {
          console.log("🚀 TrustScreen AI: Real-time tracking engaged");
          hasLoggedStart = true;
        }

        // Process Face Mesh (468 landmarks)
        if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
          const landmarks = faceResults.faceLandmarks[0];
          setFaceLandmarks(landmarks);
          
          // Calculate gaze using MediaPipe face landmarks
          const leftInnerCorner = landmarks[33];
          const leftOuterCorner = landmarks[133];
          const leftIris = landmarks[468];
          const rightInnerCorner = landmarks[362];
          const rightOuterCorner = landmarks[263];
          const rightIris = landmarks[473];

          if (leftInnerCorner && leftOuterCorner && leftIris && rightInnerCorner && rightOuterCorner && rightIris) {
            // RCA Math: Calculate iris ratio for both eyes
            const leftEyeWidth = Math.abs(leftOuterCorner.x - leftInnerCorner.x);
            const rightEyeWidth = Math.abs(rightOuterCorner.x - rightInnerCorner.x);
            const leftIrisRatio = leftEyeWidth > 0 ? (leftIris.x - Math.min(leftInnerCorner.x, leftOuterCorner.x)) / leftEyeWidth : 0.5;
            const rightIrisRatio = rightEyeWidth > 0 ? (rightIris.x - Math.min(rightInnerCorner.x, rightOuterCorner.x)) / rightEyeWidth : 0.5;
            
            // Average iris ratio for HR telemetry
            const avgIrisRatio = (leftIrisRatio + rightIrisRatio) / 2;
            setIrisRatio(avgIrisRatio);
            
            // Use average for gaze
            const gazeRatio = (leftIrisRatio + rightIrisRatio) / 2;
            setGaze({ x: gazeRatio, y: 0.5 });
          }
        }

        // Process Pose (33 landmarks) - Hand deviation detection and HR telemetry
        if (poseResults.landmarks && poseResults.landmarks.length > 0) {
          const landmarks = poseResults.landmarks[0];
          setPoseLandmarks(landmarks);
          
          // Get key pose landmarks
          const leftShoulder = landmarks[11];
          const rightShoulder = landmarks[12];
          const leftWrist = landmarks[15];
          const rightWrist = landmarks[16];
          const leftHip = landmarks[23];
          const rightHip = landmarks[24];
          
          // Calculate shoulder symmetry (for leaning detection)
          if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
            const hipSlope = Math.abs(leftHip.y - rightHip.y);
            const symmetryRatio = hipSlope > 0 ? Math.min(shoulderSlope / hipSlope, 2) : 1;
            setShoulderSymmetry(1 / symmetryRatio); // Invert so higher = better symmetry
          }
          
          // Hand visibility tracking
          if (leftWrist && rightWrist) {
            const leftVisible = Boolean(leftWrist.visibility && leftWrist.visibility > 0.5);
            const rightVisible = Boolean(rightWrist.visibility && rightWrist.visibility > 0.5);
            setHandVisibility({ left: leftVisible, right: rightVisible });
            
            // Hand deviation detection (existing logic)
            const chest = landmarks[11];
            if (chest) {
              const chestLevel = chest.y;
              const leftWristBelowChest = leftWrist.y > chestLevel;
              const rightWristBelowChest = rightWrist.y > chestLevel;
              
              if (leftWristBelowChest || rightWristBelowChest) {
                if (handDeviationStartTimeRef.current === null) {
                  handDeviationStartTimeRef.current = startTimeMs;
                } else if (startTimeMs - handDeviationStartTimeRef.current > 3000) {
                  console.log('Potential Hand Deviation violation');
                  handDeviationStartTimeRef.current = null;
                }
              } else {
                handDeviationStartTimeRef.current = null;
              }
            }
          }
        }

        if (isTracking) {
          animationId = requestAnimationFrame(track);
        }
      };

      track();
    };

    startTracking();

    return () => {
      isTracking = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isLoaded]);

  return { 
    videoRef, 
    canvasRef, 
    gaze, 
    isLoaded, 
    isSimulated,
    error, 
    isHRMode, 
    setIsHRMode,
    faceLandmarks,
    poseLandmarks,
    irisRatio,
    shoulderSymmetry,
    handVisibility
  };
};
