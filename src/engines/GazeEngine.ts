export interface Point {
  x: number;
  y: number;
}

export interface EyeLandmarks {
  innerCanthus: Point;
  outerCanthus: Point;
  pupil: Point;
}

export class GazeEngine {
  private static lerp(start: number, end: number, amt: number) {
    return (1 - amt) * start + amt * end;
  }

  /**
   * Calculates the gaze relative to the canthi anchors.
   * Based on the Relative Canthi Anchors (RCA) algorithm.
   */
  public static calculateGaze(leftEye: EyeLandmarks, rightEye: EyeLandmarks) {
    const leftX = (leftEye.pupil.x - leftEye.innerCanthus.x) / 
                  (leftEye.outerCanthus.x - leftEye.innerCanthus.x);
    const rightX = (rightEye.pupil.x - rightEye.innerCanthus.x) / 
                   (rightEye.outerCanthus.x - rightEye.innerCanthus.x);

    // Normalize vertical relative to the horizontal midline of the canthi
    const leftMidY = (leftEye.innerCanthus.y + leftEye.outerCanthus.y) / 2;
    const rightMidY = (rightEye.innerCanthus.y + rightEye.outerCanthus.y) / 2;
    
    // We assume a standard eye height for normalization or use the canthi distance
    const leftScale = Math.abs(leftEye.outerCanthus.x - leftEye.innerCanthus.x);
    const rightScale = Math.abs(rightEye.outerCanthus.x - rightEye.innerCanthus.x);

    const leftY = (leftEye.pupil.y - leftMidY) / leftScale;
    const rightY = (rightEye.pupil.y - rightMidY) / rightScale;

    return {
      x: (leftX + rightX) / 2,
      y: (leftY + rightY) / 2,
    };
  }

  /**
   * Smooths the gaze values to prevent jitter
   */
  public static smoothGaze(current: Point, target: Point, alpha: number = 0.2) {
    return {
      x: this.lerp(current.x, target.x, alpha),
      y: this.lerp(current.y, target.y, alpha),
    };
  }
}
