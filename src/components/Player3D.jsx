// src/components/Player3D.jsx
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Capsule } from '@react-three/drei';
import * as THREE from 'three';
import GunGlowEffect from './effects/GunGlowEffect'; // Import the effect

export default function Player3D({
    id,
    isLocalPlayer = false,
    position = {x:0, y:1, z:0}, // Default position adjusted for capsule origin at center
    rotationY = 0,
    health = 100,
    isDead = false,
}) {
  const groupRef = useRef(); // Group to hold player capsule and gun effects

  useEffect(() => {
    if (groupRef.current) {
      // Position prop is for the base of the player (feet on the ground)
      // Capsule origin is its center. If args=[0.5,1], total height=2, center is 1 unit above base.
      // So, groupRef (which is the logical player position) is set directly by props.
      // The Capsule itself will be at y=1 relative to this group if we want its base at y=0 of the group.
      // However, the prompt for GameCanvas passes player.y + 1 to this component's position.y,
      // meaning this component's position prop *is* the center of the capsule.
      groupRef.current.position.set(position.x || 0, position.y || 0, position.z || 0);
      groupRef.current.rotation.y = rotationY || 0;
    }
  }, [position.x, position.y, position.z, rotationY]);


  useFrame(() => {
    if (groupRef.current) {
        groupRef.current.visible = !isDead;
    }
  });

  const color = isLocalPlayer ? 'deepskyblue' : 'hotpink';

  // Capsule args: [radius, height of cylindrical part]
  // Total height = height + 2 * radius. Example: [0.5, 1] -> total height 2.
  // The Capsule's local origin is its geometric center.
  // If this Player3D component's 'position' prop is meant to be the center of the capsule,
  // then the Capsule itself should be at local position [0,0,0] within the group.
  return (
    <group ref={groupRef}>
      <Capsule args={[0.5, 1]} castShadow receiveShadow> {/* Capsule is at group's origin */}
        <meshStandardMaterial color={color} />
      </Capsule>
      {/* Position GunGlowEffect relative to the group's origin (player's center) */}
      {/* If player center (position prop) is at y=1, and gun is slightly lower and forward: */}
      <group position={[0.3, -0.2, 0.6]}>
        <GunGlowEffect active={!isDead} />
      </group>
    </group>
  );
}
