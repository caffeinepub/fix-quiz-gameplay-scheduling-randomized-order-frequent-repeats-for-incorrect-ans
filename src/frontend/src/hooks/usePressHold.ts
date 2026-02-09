import { useState, useCallback, useRef, useEffect } from 'react';

interface PressHoldHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onKeyUp: (e: React.KeyboardEvent) => void;
}

export function usePressHold(): [boolean, PressHoldHandlers] {
  const [isPressed, setIsPressed] = useState(false);
  const isPressedRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isPressedRef.current = isPressed;
  }, [isPressed]);

  const handlePressStart = useCallback(() => {
    if (!isPressedRef.current) {
      setIsPressed(true);
    }
  }, []);

  const handlePressEnd = useCallback(() => {
    if (isPressedRef.current) {
      setIsPressed(false);
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handlePressStart();
  }, [handlePressStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handlePressEnd();
  }, [handlePressEnd]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handlePressEnd();
  }, [handlePressEnd]);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    handlePressEnd();
  }, [handlePressEnd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handlePressStart();
    }
  }, [handlePressStart]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handlePressEnd();
    }
  }, [handlePressEnd]);

  const handlers: PressHoldHandlers = {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
  };

  return [isPressed, handlers];
}
