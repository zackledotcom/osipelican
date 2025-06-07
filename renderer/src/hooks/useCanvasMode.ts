import { useState, useCallback } from 'react';

export const useCanvasMode = () => {
  const [isCanvasMode, setIsCanvasMode] = useState(false);

  const toggleCanvasMode = useCallback(() => {
    setIsCanvasMode(prev => !prev);
  }, []);

  return {
    isCanvasMode,
    toggleCanvasMode
  };
}; 