# TrustScreen-v2 Production Deployment Guide

## Overview

TrustScreen-v2 is a sophisticated gaze tracking and HR monitoring application built with React, TypeScript, and MediaPipe. This document provides comprehensive deployment instructions and operational guidelines.

## Production Build Status ✅

- **Build Command**: `npm run build`
- **Output Size**: 359.17 kB (gzipped: 108.34 kB)
- **Models Directory**: Successfully copied to `dist/models/mediapipe/`
- **Base Path Config**: Configured for sub-path hosting (`base: './'`)
- **Memory Leaks**: Fixed requestAnimationFrame cleanup and MediaPipe instance management

## Docker Deployment Commands

### Build the Docker Image
```bash
docker build -t trustscreen-v2:latest .
```

### Run on Linux Server
```bash
# Run on port 80 (standard HTTP)
docker run -d \
  --name trustscreen-v2 \
  -p 80:80 \
  --restart unless-stopped \
  trustscreen-v2:latest

# Run on custom port (e.g., 8080)
docker run -d \
  --name trustscreen-v2 \
  -p 8080:80 \
  --restart unless-stopped \
  trustscreen-v2:latest
```

### Docker Compose (Recommended)
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  trustscreen-v2:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    container_name: trustscreen-v2
```

Deploy with:
```bash
docker-compose up -d
```

### Production Health Check
```bash
# Check container status
docker ps | grep trustscreen-v2

# View logs
docker logs trustscreen-v2

# Test the application
curl -I http://localhost
```

## Secret Triple-Click Toggle

### Purpose
The Secret Triple-Click Toggle enables HR monitoring mode, which provides advanced analytics and telemetry for interview assessment.

### Activation
1. **Triple-click** anywhere on the application interface within 2 seconds
2. The interface will subtly change to indicate HR mode is active
3. HR telemetry data will begin collecting in the background

### Features Enabled in HR Mode
- **Iris Ratio Tracking**: Real-time eye movement analysis
- **Shoulder Symmetry Detection**: Posture and engagement monitoring  
- **Hand Visibility Tracking**: Gesture and compliance detection
- **Advanced Telemetry**: Comprehensive behavioral analytics

### Deactivation
Triple-click again to disable HR mode and return to standard operation.

## RCA Math for HR Team

### Iris Ratio Calculation

The system calculates iris position using MediaPipe's 468 facial landmarks:

```javascript
// Eye corner landmarks
const leftInnerCorner = landmarks[33];
const leftOuterCorner = landmarks[133];
const leftIris = landmarks[468];
const rightInnerCorner = landmarks[362];
const rightOuterCorner = landmarks[263];
const rightIris = landmarks[473];

// Calculate iris ratio (0.0 = left, 1.0 = right)
const leftEyeWidth = Math.abs(leftOuterCorner.x - leftInnerCorner.x);
const rightEyeWidth = Math.abs(rightOuterCorner.x - rightInnerCorner.x);
const leftIrisRatio = leftEyeWidth > 0 ? 
  (leftIris.x - Math.min(leftInnerCorner.x, leftOuterCorner.x)) / leftEyeWidth : 0.5;
const rightIrisRatio = rightEyeWidth > 0 ? 
  (rightIris.x - Math.min(rightInnerCorner.x, rightOuterCorner.x)) / rightEyeWidth : 0.5;

// Average for final gaze position
const gazeRatio = (leftIrisRatio + rightIrisRatio) / 2;
```

### Interpretation Guidelines
- **0.45-0.55**: Normal, centered gaze
- **< 0.40**: Looking left (potential distraction)
- **> 0.60**: Looking right (potential distraction)
- **Rapid fluctuations**: May indicate nervousness or dishonesty

### Shoulder Symmetry Analysis

```javascript
// Pose landmarks for posture analysis
const leftShoulder = landmarks[11];
const rightShoulder = landmarks[12];
const leftHip = landmarks[23];
const rightHip = landmarks[24];

// Calculate symmetry ratio
const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
const hipSlope = Math.abs(leftHip.y - rightHip.y);
const symmetryRatio = hipSlope > 0 ? 
  Math.min(shoulderSlope / hipSlope, 2) : 1;
const shoulderSymmetry = 1 / symmetryRatio; // Higher = better symmetry
```

### Interpretation Guidelines
- **0.9-1.1**: Good posture, engaged
- **< 0.8**: Leaning significantly (may indicate disinterest)
- **> 1.2**: Unusual posture (may indicate discomfort)

### Hand Deviation Detection

The system monitors hand positions relative to chest level:

```javascript
const chest = landmarks[11];
const leftWrist = landmarks[15];
const rightWrist = landmarks[16];

const chestLevel = chest.y;
const leftWristBelowChest = leftWrist.y > chestLevel;
const rightWristBelowChest = rightWrist.y > chestLevel;

// Flag if hands below chest for > 3 seconds
```

### Compliance Indicators
- **Both hands visible**: High engagement
- **One hand hidden**: Moderate concern
- **Both hands hidden**: Low engagement potential
- **Hands below chest > 3s**: Potential policy violation

## Production Considerations

### Performance Optimizations
- **GPU Acceleration**: MediaPipe configured for GPU delegate
- **Memory Management**: Proper cleanup of animation frames and instances
- **Asset Optimization**: Models served from CDN-friendly paths

### Security Notes
- **HTTPS Required**: Camera access requires secure context
- **CORS Configuration**: Ensure proper headers for model loading
- **Privacy**: All processing happens client-side, no data transmitted

### Monitoring
- **Browser Console**: Monitor for MediaPipe initialization errors
- **Network Tab**: Verify model files load correctly
- **Performance Tab**: Check for memory leaks during extended use

## Troubleshooting

### Common Issues
1. **Models not loading**: Verify `/models/mediapipe/` files exist in dist
2. **Camera denied**: Ensure HTTPS and user permission
3. **Memory leaks**: Check for unclosed animation frames
4. **Build errors**: Verify TypeScript compilation

### Support Commands
```bash
# Verify build output
ls -la dist/models/mediapipe/

# Test locally
npm run preview

# Check Docker logs
docker logs trustscreen-v2 -f
```

## Version Information

- **React**: 19.2.5
- **MediaPipe Tasks Vision**: 0.10.34
- **TypeScript**: 6.0.2
- **Vite**: 8.0.9
- **Node.js**: 20.x (Alpine in Docker)

---

*TrustScreen-v2 is designed for professional HR assessment and interview monitoring. Ensure compliance with local privacy regulations and obtain appropriate consent before use.*
