// src/components/effects/MusketFireEffect.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MUZZLE_FLASH_DURATION = 100; // ms
const TRACER_DURATION = 150; // ms
const TRACER_LENGTH = 20;

export default function MusketFireEffect({ id, position, direction, onComplete }) {
  const [visible, setVisible] = useState(true);
  const startTime = useRef(Date.now());

  const flashRef = useRef();
  const tracerRef = useRef();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) {
        onComplete(id); // Notify parent that this effect is done
      }
    }, Math.max(MUZZLE_FLASH_DURATION, TRACER_DURATION) + 50); // Ensure it lasts long enough for both

    return () => clearTimeout(timer);
  }, [id, onComplete]);

  // Calculate tracer points once
  const tracerPoints = useMemo(() => { // Changed to useMemo
    const start = new THREE.Vector3(position.x, position.y, position.z);
    const end = start.clone().add(new THREE.Vector3(direction.x, direction.y, direction.z).multiplyScalar(TRACER_LENGTH));
    return [start, end];
  }, [position.x, position.y, position.z, direction.x, direction.y, direction.z]); // Updated dependencies


  useFrame(() => {
    const elapsedTime = Date.now() - startTime.current;
    if (flashRef.current) {
      flashRef.current.visible = elapsedTime < MUZZLE_FLASH_DURATION;
    }
    if (tracerRef.current) {
      tracerRef.current.visible = elapsedTime < TRACER_DURATION;
    }
  });

  if (!visible) {
    return null;
  }

  return (
    <>
      <mesh ref={flashRef} position={[position.x, position.y, position.z]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={0xffff00} transparent opacity={0.8} />
      </mesh>
      <line ref={tracerRef}>
        <bufferGeometry attach="geometry">
            <bufferAttribute
                attach="attributes-position"
                count={tracerPoints.length}
                array={new Float32Array(tracerPoints.flatMap(p => [p.x, p.y, p.z]))}
                itemSize={3}
            />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color={0xffffff} linewidth={2} transparent opacity={0.7} />
      </line>
    </>
  );
}
