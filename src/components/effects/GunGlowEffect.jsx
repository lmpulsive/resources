// src/components/effects/GunGlowEffect.jsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CONSTANTS from '../../game/constants'; // Adjust path as needed

export default function GunGlowEffect({ active = true }) {
  const pointsRef = useRef();
  const particlePoolRef = useRef([]);
  const positionsRef = useRef();
  const sizesRef = useRef();

  const count = (CONSTANTS && CONSTANTS.gunGlowParticleCount !== undefined) ? CONSTANTS.gunGlowParticleCount : 150;

  useMemo(() => {
    const pool = [];
    const posArray = new Float32Array(count * 3);
    const sizArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 0] = 0; posArray[i * 3 + 1] = 0; posArray[i * 3 + 2] = 0;
      sizArray[i] = 0;
      pool.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        lifespan: 0,
        maxLifespan: 1.0 + Math.random() * 1.0,
        baseSize: 0.15 + Math.random() * 0.1
      });
    }
    particlePoolRef.current = pool;
    positionsRef.current = posArray;
    sizesRef.current = sizArray;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !active) {
        if (pointsRef.current && pointsRef.current.visible) pointsRef.current.visible = false;
        return;
    }
    if (pointsRef.current && !pointsRef.current.visible) pointsRef.current.visible = true;

    const pool = particlePoolRef.current;
    const positions = positionsRef.current;
    const sizes = sizesRef.current;

    for (let i = 0; i < count; i++) {
      const p = pool[i];
      const i3 = i * 3;
      if (p.lifespan <= 0) {
        const spawnRadius = 0.5;
        p.x = (Math.random() - 0.5) * spawnRadius;
        p.y = (Math.random() - 0.5) * spawnRadius;
        p.z = (Math.random() - 0.5) * spawnRadius;
        p.vx = (Math.random() - 0.5) * 0.2;
        p.vy = (Math.random() * 0.5 + 0.1);
        p.vz = (Math.random() - 0.5) * 0.2;
        p.lifespan = p.maxLifespan;
      } else {
        p.lifespan -= delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.z += p.vz * delta;
        p.vx += (Math.random() - 0.5) * 0.05 * delta;
        p.vz += (Math.random() - 0.5) * 0.05 * delta;

        positions[i3 + 0] = p.x;
        positions[i3 + 1] = p.y;
        positions[i3 + 2] = p.z;
        sizes[i] = (p.lifespan / p.maxLifespan) * p.baseSize;
      }
    }
    if (pointsRef.current.geometry.attributes.position) {
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    // if (pointsRef.current.geometry.attributes.size) { // If using custom size shader
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
        {/* <bufferAttribute attach="attributes-size" count={count} array={sizesRef.current} itemSize={1} usage={THREE.DynamicDrawUsage} /> */}
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color={0x8affff}
        size={0.05}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
}
