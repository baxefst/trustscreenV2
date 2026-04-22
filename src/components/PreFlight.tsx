import React, { useState, useEffect, useRef } from 'react';
import { useGaze } from '../hooks/useGaze';

interface ValidationCheck {
  eyeCanthi: boolean;
  shoulders: boolean;
  faceCentered: boolean;
}

export const PreFlight: React.FC<{ onValidationComplete: () => void }> = ({ onValidationComplete }) => {
  const { videoRef, faceLandmarks, poseLandmarks, isLoaded, error } = useGaze();
  const [validations, setValidations] = useState<ValidationCheck>({
    eyeCanthi: false,
    shoulders: false,
    faceCentered: false
  });
  const [allValidStartTime, setAllValidStartTime] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Eye canthi validation (landmarks 33, 133)
  const validateEyeCanthi = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return false;
    
    const leftInnerCorner = landmarks[33];
    const leftOuterCorner = landmarks[133];
    
    return leftInnerCorner && leftOuterCorner && 
           leftInnerCorner.visibility > 0.3 && 
           leftOuterCorner.visibility > 0.3;
  };

  // Shoulders validation (landmarks 11, 12)
  const validateShoulders = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return false;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    return leftShoulder && rightShoulder && 
           leftShoulder.visibility > 0.3 && 
           rightShoulder.visibility > 0.3 &&
           leftShoulder.x > 0.1 && leftShoulder.x < 0.9 &&
           rightShoulder.x > 0.1 && rightShoulder.x < 0.9;
  };

  // Face centering validation
  const validateFaceCentered = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return false;
    
    // Use nose tip (landmark 1) and center of eyes for centering
    const noseTip = landmarks[1];
    const leftEyeCorner = landmarks[33];
    const rightEyeCorner = landmarks[263];
    
    if (!noseTip || !leftEyeCorner || !rightEyeCorner) return false;
    
    // Check if face is reasonably centered (not too close to edges)
    const faceCenterX = (leftEyeCorner.x + rightEyeCorner.x) / 2;
    const faceCenterY = noseTip.y;
    
    // Face should be within central 80% of the frame (expanded from 60%)
    const isCenteredX = faceCenterX > 0.1 && faceCenterX < 0.9;
    const isCenteredY = faceCenterY > 0.1 && faceCenterY < 0.9;
    
    return isCenteredX && isCenteredY && noseTip.visibility > 0.3;
  };

  // Draw webcam preview with overlay
  const drawPreview = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = 320;
    canvas.height = 240;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Draw validation indicators
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    if (faceLandmarks) {
      // Draw eye canthi indicators
      const leftInnerCorner = faceLandmarks[33];
      const leftOuterCorner = faceLandmarks[133];
      
      if (leftInnerCorner && leftOuterCorner) {
        ctx.fillStyle = validations.eyeCanthi ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(leftInnerCorner.x * canvas.width, leftInnerCorner.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(leftOuterCorner.x * canvas.width, leftOuterCorner.y * canvas.height, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    
    if (poseLandmarks) {
      // Draw shoulder indicators
      const leftShoulder = poseLandmarks[11];
      const rightShoulder = poseLandmarks[12];
      
      if (leftShoulder && rightShoulder) {
        ctx.fillStyle = validations.shoulders ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(leftShoulder.x * canvas.width, leftShoulder.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightShoulder.x * canvas.width, rightShoulder.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  // Update validations
  useEffect(() => {
    if (!isLoaded || error) return;
    
    const newValidations: ValidationCheck = {
      eyeCanthi: validateEyeCanthi(faceLandmarks || []),
      shoulders: validateShoulders(poseLandmarks || []),
      faceCentered: validateFaceCentered(faceLandmarks || [])
    };
    
    setValidations(newValidations);
    
    // Check if all validations pass
    const allValid = Object.values(newValidations).every(v => v);
    
    if (allValid) {
      if (allValidStartTime === null) {
        setAllValidStartTime(Date.now());
      } else if (Date.now() - allValidStartTime >= 3000) {
        // All validations passed for 3 seconds
        onValidationComplete();
      }
    } else {
      setAllValidStartTime(null);
    }
  }, [faceLandmarks, poseLandmarks, isLoaded, error, allValidStartTime, onValidationComplete]);

  // Draw preview
  useEffect(() => {
    const interval = setInterval(drawPreview, 100);
    return () => clearInterval(interval);
  }, [faceLandmarks, poseLandmarks, validations]);

  const allChecksPass = Object.values(validations).every(v => v);
  const progress = Object.values(validations).filter(v => v).length / 3;

  return (
    <div className="min-h-screen bg-bg-dark text-text-main flex items-center justify-center p-12">
      <div className="w-full max-w-md bg-bg-card border border-white/5 shadow-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-primary shadow-[0_0_20px_var(--primary-glow)]" />
        
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">System Check</h1>
          <p className="text-[10px] font-mono text-text-muted tracking-[0.4em] uppercase">Environmental Validation</p>
        </header>

        {/* Webcam Preview */}
        <div className="mb-8 relative">
          <div className="relative aspect-video bg-black/50 border border-white/10 rounded overflow-hidden">
            <video 
              ref={videoRef} 
              className="hidden" 
              muted 
              playsInline 
              autoPlay 
            />
            <canvas 
              ref={canvasRef}
              className="w-full h-full object-cover"
            />
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Loading camera...</p>
                  <p className="text-[8px] text-text-muted/60 mt-4 px-4">
                    Please enable camera permissions in your browser settings if the scan does not start.
                  </p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}
          </div>
          
          {/* Status Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Scanning Environment...</span>
              <span className="text-[10px] font-mono text-primary">{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_var(--primary-glow)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-3 bg-bg-dark/40 border border-white/5 rounded">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${validations.eyeCanthi ? 'bg-success shadow-[0_0_4px_var(--success)]' : 'bg-white/20'}`} />
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Eye Canthi Visible</span>
            </div>
            <span className={`text-[8px] font-mono ${validations.eyeCanthi ? 'text-success' : 'text-text-muted'}`}>
              {validations.eyeCanthi ? 'PASS' : 'SCAN'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-bg-dark/40 border border-white/5 rounded">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${validations.shoulders ? 'bg-success shadow-[0_0_4px_var(--success)]' : 'bg-white/20'}`} />
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Shoulders in Frame</span>
            </div>
            <span className={`text-[8px] font-mono ${validations.shoulders ? 'text-success' : 'text-text-muted'}`}>
              {validations.shoulders ? 'PASS' : 'SCAN'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-bg-dark/40 border border-white/5 rounded">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${validations.faceCentered ? 'bg-success shadow-[0_0_4px_var(--success)]' : 'bg-white/20'}`} />
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Face Centered</span>
            </div>
            <span className={`text-[8px] font-mono ${validations.faceCentered ? 'text-success' : 'text-text-muted'}`}>
              {validations.faceCentered ? 'PASS' : 'SCAN'}
            </span>
          </div>
        </div>

        {/* Begin Interview Button */}
        <button
          disabled={!allChecksPass}
          className={`w-full px-6 py-3 font-black uppercase text-[10px] tracking-[0.3em] transition-all duration-300 ${
            allChecksPass
              ? 'bg-primary text-bg-dark hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_var(--primary-glow)]'
              : 'bg-white/5 text-text-muted/40 cursor-not-allowed border border-white/10'
          }`}
        >
          {allChecksPass ? 'Begin Interview' : 'Awaiting Validation...'}
        </button>

        {/* Timer indicator */}
        {allChecksPass && allValidStartTime && (
          <div className="mt-4 text-center">
            <p className="text-[8px] text-success font-mono">
              System verified. Transitioning in {Math.max(0, 3 - Math.floor((Date.now() - allValidStartTime) / 1000))}s...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
