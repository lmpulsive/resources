// src/components/effects/WindParticles.jsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CONSTANTS from '../../game/constants'; // Adjust path as needed

const PARTICLE_COUNT = 4000; // Matching original

export default function WindParticles({ playerPosition }) {
  const pointsRef = useRef();
  const positionsRef = useRef(); // To store the Float32Array for direct manipulation

  // Initialize particle positions once
  const initialPositions = useMemo(() => {
    const posArray = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3 + 0] = Math.random() * 300 - 150; // x
      posArray[i * 3 + 1] = Math.random() * 60 + 20;  // y
      posArray[i * 3 + 2] = Math.random() * 300 - 150; // z
    }
    positionsRef.current = posArray; // Store for useFrame
    return posArray;
  }, []);

  // Vertex colors (can also be done once)
  const colors = useMemo(() => {
    const colArray = new Float32Array(PARTICLE_COUNT * 3);
    const pColor = new THREE.Color(0xffffff);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colArray[i * 3 + 0] = pColor.r;
      colArray[i * 3 + 1] = pColor.g;
      colArray[i * 3 + 2] = pColor.b;
    }
    return colArray;
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current || !playerPosition || !positionsRef.current || !playerPosition.hasOwnProperty('x')) return; // Added hasOwnProperty check

    const positions = positionsRef.current;
    const currentPPosition = playerPosition;

    const resetHeight = currentPPosition.y + 40;
    const fallSpeed = 3; // Consider making this a constant
    // Use constants from the imported CONSTANTS module, with fallbacks
    const drawDist = (CONSTANTS && CONSTANTS.snowDrawDistance !== undefined) ? CONSTANTS.snowDrawDistance : 40;
    const drift = (CONSTANTS && CONSTANTS.windDriftSpeed !== undefined) ? CONSTANTS.windDriftSpeed : 0.5;


    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3 + 1] -= (0.5 + Math.random() * 0.5) * delta * fallSpeed; // Y
      positions[i3 + 0] += (Math.random() - 0.5) * drift * delta;     // X
      positions[i3 + 2] += (Math.random() - 0.5) * drift * delta;     // Z

      const dx = positions[i3 + 0] - currentPPosition.x;
      const dz = positions[i3 + 2] - currentPPosition.z;

      if (positions[i3 + 1] < currentPPosition.y - 2 || Math.sqrt(dx * dx + dz * dz) > drawDist) {
        positions[i3 + 0] = currentPPosition.x + (Math.random() * 2 * drawDist - drawDist) * 2;
        positions[i3 + 1] = resetHeight + (Math.random() * 10);
        positions[i3 + 2] = currentPPosition.z + (Math.random() * 2 * drawDist - drawDist) * 2;
      }
    }
    if (pointsRef.current.geometry.attributes.position) { // Ensure attribute exists
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={initialPositions}
          itemSize={3}
          usage={THREE.DynamicDrawUsage} // Indicate that this buffer will be updated frequently
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        size={0.3}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}
