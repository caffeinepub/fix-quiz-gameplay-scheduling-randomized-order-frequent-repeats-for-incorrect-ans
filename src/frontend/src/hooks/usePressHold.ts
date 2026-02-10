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
  const pointerIdRef = useRef<number | null>(null);

  // Sync ref with state
  useEffect(() => {
    isPressedRef.current = isPressed;
  }, [isPressed]);

  const handlePressStart = useCallback((pointerId?: number) => {
    if (!isPressedRef.current) {
      setIsPressed(true);
      if (pointerId !== undefined) {
        pointerIdRef.current = pointerId;
      }
    }
  }, []);

  const handlePressEnd = useCallback(() => {
    if (isPressedRef.current) {
      setIsPressed(false);
      pointerIdRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePressStart(e.pointerId);
  }, [handlePressStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    handlePressEnd();
  }, [handlePressEnd]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    handlePressEnd();
  }, [handlePressEnd]);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    // Only end press if this is the captured pointer
    if (pointerIdRef.current === e.pointerId) {
      e.preventDefault();
      handlePressEnd();
    }
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
