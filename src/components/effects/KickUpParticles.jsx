// src/components/effects/KickUpParticles.jsx
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CONSTANTS from '../../game/constants'; // Adjust path as needed

export default function KickUpParticles({ characterPosition, isCharacterMoving, active }) {
  const pointsRef = useRef();
  const particlePoolRef = useRef([]);
  const positionsRef = useRef();
  const sizesRef = useRef();

  const count = (CONSTANTS && CONSTANTS.kickUpCount !== undefined) ? CONSTANTS.kickUpCount : 100;

  useMemo(() => {
    const pool = [];
    const posArray = new Float32Array(count * 3);
    const sizArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 0] = 0;
      posArray[i * 3 + 1] = -1000;
      posArray[i * 3 + 2] = 0;
      sizArray[i] = 0;

      pool.push({
        x: 0, y: -1000, z: 0,
        vx: 0, vy: 0, vz: 0,
        lifespan: 0,
        maxLifespan: ((CONSTANTS && CONSTANTS.kickUpMaxLifespan !== undefined) ? CONSTANTS.kickUpMaxLifespan : 0.5) * (0.6 + Math.random() * 0.8),
        baseSize: 0.15 + Math.random() * 0.1
      });
    }
    particlePoolRef.current = pool;
    positionsRef.current = posArray;
    sizesRef.current = sizArray;
  }, [count]); // Dependency on count ensures re-init if count changes (though it's from const)

  useFrame((state, delta) => {
    if (!pointsRef.current || !characterPosition || !active || !characterPosition.hasOwnProperty('x')) {
        if (pointsRef.current && pointsRef.current.visible) pointsRef.current.visible = false;
        return;
    }
    if (pointsRef.current && !pointsRef.current.visible) pointsRef.current.visible = true;

    const pool = particlePoolRef.current;
    const positions = positionsRef.current;
    const sizes = sizesRef.current;

    const emitRate = (CONSTANTS && CONSTANTS.kickUpEmitRate !== undefined) ? CONSTANTS.kickUpEmitRate : 10;
    const currentPPosition = characterPosition;
    const gravityVal = (CONSTANTS && CONSTANTS.gravity !== undefined) ? CONSTANTS.gravity : -25;


    if (isCharacterMoving) {
      const particlesToEmit = Math.floor(emitRate * delta) || 1;
      let emittedThisFrame = 0;
      for (let i = 0; i < count && emittedThisFrame < particlesToEmit; i++) {
        const p = pool[i];
        if (p.lifespan <= 0) {
          p.x = currentPPosition.x + (Math.random() - 0.5) * 1.5;
          p.y = currentPPosition.y + 0.5;
          p.z = currentPPosition.z + (Math.random() - 0.5) * 1.5;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = Math.random() * 3 + 1;
          p.vz = (Math.random() - 0.5) * 2;
          p.lifespan = p.maxLifespan;
          emittedThisFrame++;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const p = pool[i];
      const i3 = i * 3;
      if (p.lifespan > 0) {
        p.lifespan -= delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vy += gravityVal * delta; // Gravity is negative, so += is correct

        positions[i3 + 0] = p.x;
        positions[i3 + 1] = p.y;
        positions[i3 + 2] = p.z;
        sizes[i] = (p.lifespan / p.maxLifespan);

        // Using character's base Y for ground collision check
        if (p.y < currentPPosition.y -0.01) {
             p.lifespan = 0;
        }

      } else {
        positions[i3 + 1] = -1000;
        sizes[i] = 0;
      }
    }
    if (pointsRef.current.geometry.attributes.position) {
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    // If using custom shader for sizes:
    // if (pointsRef.current.geometry.attributes.size) {
    //     pointsRef.current.geometry.attributes.size.needsUpdate = true;
    // }
  });

  if (!active) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positionsRef.current}
          itemSize={3}
          usage={THREE.DynamicDrawUsage}
        />
        {/* If using sizes for shader: */}
        {/* <bufferAttribute attach="attributes-size" count={count} array={sizesRef.current} itemSize={1} usage={THREE.DynamicDrawUsage} /> */}
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color={0xffffff}
        size={0.15}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}
