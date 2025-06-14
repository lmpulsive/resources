// src/hooks/useInputManager.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useInputManager() {
  const keys = useRef({});
  const prevKeys = useRef({});

  const [cameraRotationAngle, setCameraRotationAngleState] = useState(0);
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);

  // Keyboard listeners
  useEffect(() => {
    const keyMap = { 'w':false, 'a':false, 's':false, 'd':false, ' ':false, 'f':false };
    keys.current = {...keyMap}; // Initialize with known keys
    prevKeys.current = {...keyMap};

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = true;
      }
    };
    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Mouse event handlers to be attached to the canvas
  const onPointerDown = useCallback((event) => {
    isDraggingRef.current = true;
    // For R3F, event.pointer.x (normalized device coords) or event.unprojectedPoint (world units on pointer plane)
    // For screen coords, event.nativeEvent.clientX is generally reliable.
    if (event.nativeEvent && typeof event.nativeEvent.clientX === 'number') {
        previousMouseXRef.current = event.nativeEvent.clientX;
    } else if (typeof event.clientX === 'number') { // Fallback for direct mouse events
        previousMouseXRef.current = event.clientX;
    }
    // Important: If the canvas is not full screen or has offsets, clientX might need adjustments.
    // R3F's event system often provides event.point (Vector3 in world space on the intersected object)
    // which might be more useful than clientX for some interactions.
    // For simple camera rotation based on drag delta, clientX is usually fine.
  }, []);

  const onPointerMove = useCallback((event) => {
    if (!isDraggingRef.current) return;
    let currentX = 0;
    if (event.nativeEvent && typeof event.nativeEvent.clientX === 'number') {
        currentX = event.nativeEvent.clientX;
    } else if (typeof event.clientX === 'number') {
        currentX = event.clientX;
    }

    const deltaX = currentX - previousMouseXRef.current;
    setCameraRotationAngleState(prevAngle => prevAngle + deltaX * 0.005);
    previousMouseXRef.current = currentX;
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const onPointerLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);


  // Function to update previous key states, call this each frame
  const updatePrevKeys = useCallback(() => {
    prevKeys.current = { ...keys.current };
  }, []);

  // Function to check if a key was just pressed
  const isKeyJustPressed = useCallback((key) => {
    return keys.current[key] && !prevKeys.current[key];
  }, []);

  // Function to get current key states
  const getKeys = useCallback(() => {
    return keys.current;
  }, []);

  // Setter for cameraRotationAngle (e.g., for reset)
  const setCameraRotation = useCallback((angle) => {
    setCameraRotationAngleState(angle);
  }, []);

  return {
    getKeys,
    isKeyJustPressed,
    cameraRotationAngle,
    setCameraRotation,
    updatePrevKeys,
    // Event handlers to spread onto the R3F Canvas
    canvasEventHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerOut: onPointerLeave,
      onPointerLeave: onPointerLeave
    }
  };
}
