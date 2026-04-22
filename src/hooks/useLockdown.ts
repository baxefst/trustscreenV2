import { useEffect, useCallback } from 'react';
import { useTrustStore } from '../store/useTrustStore';

export const useLockdown = (enabled: boolean) => {
  const { deductPoints, addViolation, setFullscreenExited, isFinished } = useTrustStore();

  const handleFullscreenExit = useCallback(() => {
    if (!document.fullscreenElement && !isFinished) {
      setFullscreenExited(true);
      addViolation('Fullscreen exited');
    }
  }, [setFullscreenExited, addViolation, isFinished]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden' && !isFinished) {
      deductPoints(10, 'Tab switched or Window minimized');
    }
  }, [deductPoints, isFinished]);

  const handleBlur = useCallback(() => {
    if (!isFinished) {
      deductPoints(10, 'Window lost focus');
    }
  }, [deductPoints, isFinished]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!isFinished) {
      e.preventDefault();
      addViolation('Right-click blocked');
    }
  }, [addViolation, isFinished]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFinished) return;
    
    // Block Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      addViolation(`Unauthorized clipboard action blocked: Ctrl+${e.key.toUpperCase()}`);
    }
  }, [addViolation, isFinished]);

  useEffect(() => {
    if (!enabled || isFinished) {
      // Remove listeners explicitly when finished
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      
      // Also exist fullscreen if finished
      if (isFinished && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }

    document.addEventListener('fullscreenchange', handleFullscreenExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, isFinished, handleFullscreenExit, handleVisibilityChange, handleBlur, handleContextMenu, handleKeyDown]);

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !isFinished) {
        await document.documentElement.requestFullscreen();
        setFullscreenExited(false);
      }
    } catch (err) {
      addViolation('Fullscreen request failed');
    }
  };

  return { requestFullscreen };
};
