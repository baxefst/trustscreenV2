import React, { useEffect, useRef, useState } from 'react';
import { useTrustStore } from '../store/useTrustStore';
import { useGaze } from '../hooks/useGaze';

interface Point {
  x: number;
  y: number;
  z?: number;
}

/**
 * Draw landmarks on canvas
 */
const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Point[], color: string, size: number = 3) => {
  ctx.fillStyle = color;
  landmarks.forEach(landmark => {
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, size, 0, 2 * Math.PI);
    ctx.fill();
  });
};

/**
 * Draw connections between landmarks (skeleton)
 */
const drawConnections = (ctx: CanvasRenderingContext2D, landmarks: Point[], connections: [number, number][], color: string) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    if (startPoint && endPoint) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
  });
};

// Pose skeleton connections (MediaPipe Pose)
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
  [11, 23], [12, 24], [23, 24], // Torso
  [23, 25], [25, 27], [24, 26], [26, 28] // Legs
];

// Face mesh connections (simplified)
const FACE_CONNECTIONS: [number, number][] = [
  [33, 133], [33, 7], [133, 155], [155, 154], [154, 153], [153, 145], [145, 144], [144, 163], [163, 7], // Eye area
  [468, 469], [469, 470], [470, 471], [471, 472] // Iris
];

export const GazeTrackerMediaPipe: React.FC<{ isSecure: boolean }> = ({ isSecure }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const awayStartTimeRef = useRef<number | null>(null);
  const [isAway, setIsAway] = useState(false);
  
  const { 
    videoRef, 
    gaze, 
    isHRMode, 
    setIsHRMode,
    faceLandmarks,
    poseLandmarks
  } = useGaze();

  // Draw overlays when HR mode is enabled
  useEffect(() => {
    if (!isHRMode || !canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw face mesh (468 landmarks) with cyber-audit aesthetic
    if (faceLandmarks) {
      drawLandmarks(ctx, faceLandmarks, '#06b6d4', 1.5);
      drawConnections(ctx, faceLandmarks, FACE_CONNECTIONS, '#06b6d4');
      
      // Add glow effect for iris landmarks
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      drawLandmarks(ctx, faceLandmarks.slice(468, 473), '#06b6d4', 3);
      ctx.shadowBlur = 0;
    }
    
    // Draw pose skeleton (33 landmarks) with neon-cyan cyber-audit aesthetic
    if (poseLandmarks) {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      drawConnections(ctx, poseLandmarks, POSE_CONNECTIONS, '#06b6d4');
      ctx.shadowBlur = 0;
      
      // Draw key joint points with enhanced glow
      const keyJoints = [11, 12, 15, 16, 23, 24]; // Shoulders, wrists, hips
      keyJoints.forEach(jointIndex => {
        const joint = poseLandmarks[jointIndex];
        if (joint) {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(joint.x, joint.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }
  }, [isHRMode, faceLandmarks, poseLandmarks]);

  // Gaze deviation detection
  useEffect(() => {
    if (!gaze) return;
    
    const ratio = gaze.x;
    const lookingAway = ratio < 0.25 || ratio > 0.75;
    const startTimeMs = performance.now();
    
    if (lookingAway) {
      if (awayStartTimeRef.current === null) {
        awayStartTimeRef.current = startTimeMs;
      } else if (startTimeMs - awayStartTimeRef.current > 1500) {
        if (!isAway) {
          setIsAway(true);
          useTrustStore.getState().deductPoints(5, 'Sustained Gaze Deviation');
        }
      }
    } else {
      awayStartTimeRef.current = null;
      setIsAway(false);
    }
  }, [gaze, isAway]);

  const borderClass = isAway 
    ? 'border-danger shadow-[0_0_20px_var(--danger-glow)]' 
    : isSecure 
      ? 'border-success shadow-[0_0_20px_var(--success-glow)]' 
      : 'border-white/5';

  return (
    <div className="w-full flex flex-col gap-8 items-center">
      <div className={`relative w-80 aspect-video overflow-hidden transition-all duration-500 border bg-black ${borderClass}`}>
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover grayscale opacity-50 contrast-125" 
          style={{ 
            willChange: 'transform, contents',
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
            imageRendering: 'pixelated'
          }}
          muted 
          playsInline 
          autoPlay 
        />
        
        {/* Overlay canvas for HR mode with cyber-audit aesthetic */}
        {isHRMode && (
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              mixBlendMode: 'screen', 
              filter: 'brightness(1.2) contrast(1.1)',
              willChange: 'transform, contents',
              transform: 'translate3d(0,0,0)',
              imageRendering: 'pixelated'
            }}
          />
        )}
        
        {/* Minimal Intensity Indicator */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5">
          <div 
            className={`h-full transition-all duration-75 ${isAway ? 'bg-danger shadow-[0_0_5px_var(--danger)]' : 'bg-primary'}`}
            style={{ width: `${gaze.x * 100}%` }}
          />
        </div>

        {/* HUD Elements with cyber-audit aesthetic */}
        <div className={`absolute inset-0 p-3 flex flex-col justify-between pointer-events-none ${isHRMode ? 'opacity-60' : 'opacity-40'}`}>
           <div className="flex justify-between items-start">
              <div className={`w-2 h-2 border-t border-l ${isHRMode ? 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'border-white/50'}`} />
              <div className={`w-2 h-2 border-t border-r ${isHRMode ? 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'border-white/50'}`} />
           </div>
           <div className="flex justify-between items-end">
              <div className={`w-2 h-2 border-b border-l ${isHRMode ? 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'border-white/50'}`} />
              <div className={`w-2 h-2 border-b border-r ${isHRMode ? 'border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'border-white/50'}`} />
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-[10px] font-bold tracking-[.4em] uppercase transition-colors px-4 py-1 border border-white/5 ${isAway ? 'text-danger border-danger/30' : 'text-text-muted'}`}>
          {isAway ? 'Violation Detected' : 'Telemetry Synchronized'}
        </div>
        
        {/* HR Mode Toggle */}
        <button
          onClick={() => setIsHRMode(!isHRMode)}
          className={`text-[10px] font-bold tracking-[.4em] uppercase transition-colors px-4 py-1 border ${isHRMode ? 'text-primary border-primary/30 bg-primary/5' : 'text-text-muted border-white/5'}`}
        >
          {isHRMode ? 'HR Mode ON' : 'HR Mode OFF'}
        </button>
      </div>
    </div>
  );
};
