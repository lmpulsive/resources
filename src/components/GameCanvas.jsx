// src/components/GameCanvas.jsx
import React, { useRef, useMemo } from 'react'; // Added useMemo
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei'; // PerspectiveCamera removed as it's set on Canvas
import { useInputManager } from '../hooks/useInputManager';
import { useGame } from '../contexts/GameContext';
import Player3D from './Player3D';
import MusketFireEffect from './effects/MusketFireEffect';
import WindParticles from './effects/WindParticles';
import KickUpParticles from './effects/KickUpParticles';
import ShrineParticleEffect from './effects/ShrineParticleEffect'; // Import new component
import { socket } from '../socket';
import * as THREE from 'three';

function SpinningCube() {
  const meshRef = useRef();
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });
  return (
    <mesh ref={meshRef} position={[0, 1, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

function GameLoopLogic({ inputManager, worldInstance, playerInstance }) { // Added worldInstance, playerInstance
  const { getKeys, cameraRotationAngle, updatePrevKeys, isKeyJustPressed } = inputManager;
  const { ownPlayerId, updateHeartPosition } = useGame();
  const tempVec3 = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (socket.connected && ownPlayerId) {
      const currentKeys = getKeys();
      socket.emit('playerInput', {
        keys: currentKeys,
        cameraRotation: cameraRotationAngle
      });

      if (isKeyJustPressed('f')) {
        const aimDirection = new THREE.Vector3();
        state.camera.getWorldDirection(aimDirection);
        socket.emit('playerAction', {
          action: "fire_musket",
          direction: { x: aimDirection.x, y: aimDirection.y, z: aimDirection.z }
        });
      }
      // Local player animation update based on current input (for responsiveness)
      // This uses the vanilla JS PLAYER_INSTANCE methods for animation logic.
      if (playerInstance) {
           playerInstance.handlePlayerMovementAndAnimation(delta, currentKeys, state.camera, GAMELOGIC_INSTANCE.clock, UTILS.lerpAngles);
      }

    } else if (playerInstance) { // Offline or not yet initialized - use playerInstance for local movement
        const playerMovementData = playerInstance.handlePlayerMovementAndAnimation(
            delta, inputManager.getKeys(),
            state.camera, // Use R3F camera state
            GAMELOGIC_INSTANCE.clock,
            UTILS.lerpAngles
        );

        let proposedFullPosition = new THREE.Vector3(
            playerInstance.characterGroup.position.x + playerMovementData.intendedDisplacement.x,
            playerInstance.characterGroup.position.y,
            playerInstance.characterGroup.position.z + playerMovementData.intendedDisplacement.z
        );

        const terrainInfo = GAMELOGIC_INSTANCE.handleCollisionsAndTerrain(
            playerInstance.characterGroup, proposedFullPosition, worldInstance.collidableMeshes, // Use worldInstance here
            CONSTANTS.mapHalfSize, CONSTANTS.characterCollisionRadius
        );

        playerInstance.characterGroup.position.x = terrainInfo.correctedPos.x;
        playerInstance.characterGroup.position.z = terrainInfo.correctedPos.z;
        playerInstance.updateVerticalState(delta, terrainInfo.floorY);

        if (playerMovementData.effectiveMoveDir && playerMovementData.effectiveMoveDir.lengthSq() > 0) {
             const targetRotationY = Math.atan2(playerMovementData.effectiveMoveDir.x, playerMovementData.effectiveMoveDir.z);
             playerInstance.characterGroup.rotation.y = UTILS.lerpAngles(playerInstance.characterGroup.rotation.y, targetRotationY, 0.1);
        }
    }


    // Update heart positions in context
    if (worldInstance) {
      if (worldInstance.redCrystalHeart && worldInstance.redCrystalHeart.getWorldPosition) { // Check if it's a THREE.Object3D
        updateHeartPosition('red', worldInstance.redCrystalHeart.getWorldPosition(tempVec3));
      } else {
        updateHeartPosition('red', null);
      }
      if (worldInstance.blueCrystalHeart && worldInstance.blueCrystalHeart.getWorldPosition) {
        updateHeartPosition('blue', worldInstance.blueCrystalHeart.getWorldPosition(tempVec3));
      } else {
        updateHeartPosition('blue', null);
      }
    }

    updatePrevKeys();
  });

  return null;
}

function SceneContent({ inputManager }) {
  const { players, ownPlayerId, activeEffects, removeEffect, redHeartPosition, blueHeartPosition } = useGame();
  const localPlayer = players[ownPlayerId];

  let isMoving = false;
  if (localPlayer && inputManager) {
    const currentKeys = inputManager.getKeys();
    isMoving = currentKeys.w || currentKeys.a || currentKeys.s || currentKeys.d;
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        color="white" intensity={1.0} position={[10, 15, 10]} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-25} shadow-camera-right={25}
        shadow-camera-top={25} shadow-camera-bottom={-25}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="grey" />
      </mesh>

      <SpinningCube />

      {Object.values(players).map(player => (
        <Player3D
          key={player.id}
          id={player.id}
          isLocalPlayer={player.id === ownPlayerId}
          position={{ x: player.x, y: player.y + 1, z: player.z }}
          rotationY={player.rotY}
          health={player.health}
          isDead={player.isDead}
        />
      ))}

      {activeEffects.map(effect => {
        if (effect.type === "musket_fire") {
          return (
            <MusketFireEffect
              key={effect.id}
              id={effect.id}
              position={effect.position}
              direction={effect.direction}
              onComplete={removeEffect}
            />
          );
        }
        return null;
      })}

      {localPlayer && localPlayer.x !== undefined && (
        <WindParticles playerPosition={{x: localPlayer.x, y: localPlayer.y, z: localPlayer.z}} />
      )}

      {localPlayer && localPlayer.x !== undefined && (
        <KickUpParticles
          characterPosition={{x: localPlayer.x, y: localPlayer.y, z: localPlayer.z}}
          isCharacterMoving={isMoving}
          active={!!localPlayer}
        />
      )}

      {/* Render Shrine Particle Effects based on context positions */}
      {redHeartPosition && <ShrineParticleEffect centerPosition={redHeartPosition} color={0xff4500} active={true} />}
      {blueHeartPosition && <ShrineParticleEffect centerPosition={blueHeartPosition} color={0x87ceeb} active={true} />}
    </>
  );
}

export default function GameCanvas({ worldInstance, playerInstance }) { // Accept worldInstance & playerInstance
  const inputManager = useInputManager();

  return (
    <Canvas
      style={{ background: '#0a0a20' }}
      shadows
      camera={{ fov: 75, position: [0, 5, 15], near: 0.1, far: 1000 }}
      {...inputManager.canvasEventHandlers}
    >
      <OrbitControls />
      <SceneContent inputManager={inputManager} />
      <GameLoopLogic inputManager={inputManager} worldInstance={worldInstance} playerInstance={playerInstance} />
    </Canvas>
  );
}
