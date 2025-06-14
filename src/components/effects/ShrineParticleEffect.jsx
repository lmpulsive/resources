// src/components/effects/ShrineParticleEffect.jsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import * as CONSTANTS from '../../game/constants';

export default function ShrineParticleEffect({
    centerPosition, // THREE.Vector3 from context, or null
    color,
    active = true
}) {
  const pointsRef = useRef();
  const particlePoolRef = useRef([]);
  const positionsRef = useRef();
  const sizesRef = useRef(); // For potential future per-particle size shader attribute

  const count = (CONSTANTS && CONSTANTS.shrineParticleCount !== undefined) ? CONSTANTS.shrineParticleCount : 500;

  useMemo(() => {
    const pool = [];
    const posArray = new Float32Array(count * 3);
    const sizArray = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      posArray[i*3]=0; posArray[i*3+1]=0; posArray[i*3+2]=0; sizArray[i]=0;
      pool.push({
        x:0,y:0,z:0,vx:0,vy:0,vz:0,
        lifespan:0,
        maxLifespan:0.8+Math.random()*0.7, // From original vanilla JS version
        baseSize:0.4+Math.random()*0.4  // From original vanilla JS version
    });
    }
    particlePoolRef.current = pool;
    positionsRef.current = posArray;
    sizesRef.current = sizArray;
  }, [count]); // Re-initialize if count changes

  useFrame((state, delta) => {
    if (!pointsRef.current || !active || !centerPosition) {
        if (pointsRef.current && pointsRef.current.visible) pointsRef.current.visible = false;
        return;
    }
    if (pointsRef.current && !pointsRef.current.visible) pointsRef.current.visible = true;

    // Position the entire Points system at the shrine's center (e.g., crystal heart position)
    pointsRef.current.position.copy(centerPosition);

    const pool = particlePoolRef.current;
    const positions = positionsRef.current;
    const sizes = sizesRef.current; // Currently not used directly by PointsMaterial for individual sizes

    for(let i=0; i<count; i++){
      const p=pool[i]; const i3=i*3;
      if(p.lifespan<=0){ // Particle is dead, respawn it
        // Spawn around the Points system's local origin (0,0,0)
        p.x=(Math.random()-0.5)*0.5; // Spread around origin
        p.y=(Math.random()-0.5)*0.5;
        p.z=(Math.random()-0.5)*0.5;
        const angle=Math.random()*Math.PI*2;
        const speed=2+Math.random()*3; // Speed from original vanilla JS
        p.vx=Math.cos(angle)*speed*((Math.random()>0.5)?1:-1);
        p.vy=2.0+Math.random()*4.0; // Upward burst
        p.vz=Math.sin(angle)*speed*((Math.random()>0.5)?1:-1);
        p.lifespan=p.maxLifespan;
      }else{ // Particle is alive, update it
        p.lifespan-=delta;
        p.x+=p.vx*delta;
        p.y+=p.vy*delta;
        p.z+=p.vz*delta;
        p.vy-=1.5*delta; // Gravity/downward arc from original vanilla JS

        positions[i3+0]=p.x;
        positions[i3+1]=p.y;
        positions[i3+2]=p.z;
        sizes[i]=(p.lifespan/p.maxLifespan)*p.baseSize; // Factor for potential use in shader
      }
    }
    if(pointsRef.current.geometry.attributes.position) {
        pointsRef.current.geometry.attributes.position.needsUpdate=true;
    }
    // If using sizes for shader:
    // if(pointsRef.current.geometry.attributes.size) {
    //     pointsRef.current.geometry.attributes.size.needsUpdate=true;
    // }
  });

  if (!active || !centerPosition) return null; // Don't render if not active or no center

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positionsRef.current}
            itemSize={3}
            usage={THREE.DynamicDrawUsage} // Mark as dynamic
        />
        {/* If using sizes for shader:
        <bufferAttribute attach="attributes-size" count={count} array={sizesRef.current} itemSize={1} usage={THREE.DynamicDrawUsage}/>
        */}
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color={color}
        size={0.2} // Global size for PointsMaterial (original was 0.5, R3F might scale differently)
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
}
