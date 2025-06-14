import * as THREE from 'three';
import * as CONSTANTS from './constants.js';
import * as UTILS from './utils.js';
import * as INPUT_MANAGER from './input.js';
import { initRenderer, updateCameraAndSpotlight, renderScene, camera as RENDERER_CAMERA_INSTANCE } from './renderer.js';
import * as PARTICLE_SYSTEMS from './particleSystems.js';
import { Player as PlayerClass } from './player.js';
import { World as WorldClass } from './world.js';
import GAMELOGIC_INSTANCE from './gameLogic.js';

// Global variable for the socket, or manage within an App/Network class later
let socket = null;

// For remote players
let remotePlayers = {};
let ownPlayerId = null;

let gameScene, gameRendererDOM;
let PLAYER_INSTANCE, WORLD_INSTANCE;
let gunGlowParticlesObject;

// Helper to create simple musket fire visual effect
function createMusketFireEffect(origin, direction) {
    if (!gameScene) return;

    const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(origin);
    gameScene.add(flash);
    setTimeout(() => {
        if (flash.parent) gameScene.remove(flash);
        flash.geometry.dispose();
        flash.material.dispose();
    }, 100);

    const points = [];
    points.push(origin.clone());
    const endPoint = origin.clone().add(direction.clone().multiplyScalar(20));
    points.push(endPoint);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.7 });
    const tracer = new THREE.Line(lineGeometry, lineMaterial);
    gameScene.add(tracer);
    setTimeout(() => {
        if (tracer.parent) gameScene.remove(tracer);
        tracer.geometry.dispose();
        tracer.material.dispose();
    }, 150);
}


try {
  socket = io('http://localhost:3000');

  socket.on('connect', () => {
    console.log('Successfully connected to Socket.IO server! Socket ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from Socket.IO server. Reason:', reason);
    for (const id in remotePlayers) {
        if (remotePlayers[id].characterGroup && remotePlayers[id].characterGroup.parent) {
            gameScene.remove(remotePlayers[id].characterGroup);
            remotePlayers[id].characterGroup.traverse(obj => {
                if(obj.isMesh){
                    if(obj.geometry) obj.geometry.dispose();
                    if(obj.material){
                        if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
                        else if(obj.material.isMaterial) obj.material.dispose();
                    }
                }
            });
        }
    }
    remotePlayers = {};
    ownPlayerId = null;
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });

  socket.on('initializePlayer', (data) => {
    console.log('Player initialized by server:', data);
    ownPlayerId = data.id;
    if (PLAYER_INSTANCE) {
        PLAYER_INSTANCE.characterGroup.position.set(data.initialState.x, data.initialState.y, data.initialState.z);
        PLAYER_INSTANCE.characterGroup.rotation.y = data.initialState.rotY;
        PLAYER_INSTANCE.setHealth(data.initialState.health);
        PLAYER_INSTANCE.setIsDead(data.initialState.isDead);
    }
  });

  socket.on('playerJoined', (playerData) => {
    console.log('Player joined:', playerData);
    if (playerData.id === ownPlayerId) return;

    if (!remotePlayers[playerData.id]) {
        const remotePlayer = new PlayerClass(gameScene, 'pharaoh', null, CONSTANTS);
        remotePlayer.characterGroup.name = `remote_player_${playerData.id}`;
        remotePlayer.setPosition(playerData.x, playerData.y, playerData.z);
        remotePlayer.setRotationY(playerData.rotY);
        remotePlayer.setHealth(playerData.health);
        remotePlayer.setIsDead(playerData.isDead);
        remotePlayers[playerData.id] = remotePlayer;
    }
  });

  socket.on('playerLeft', (playerId) => {
    console.log('Player left:', playerId);
    if (remotePlayers[playerId]) {
        if (remotePlayers[playerId].characterGroup && remotePlayers[playerId].characterGroup.parent) {
            gameScene.remove(remotePlayers[playerId].characterGroup);
             remotePlayers[playerId].characterGroup.traverse(obj => {
                if(obj.isMesh){
                    if(obj.geometry) obj.geometry.dispose();
                    if(obj.material) {
                        if(Array.isArray(obj.material)) obj.material.forEach(m=>m.dispose());
                        else if(obj.material.isMaterial) obj.material.dispose();
                    }
                }
             });
        }
        delete remotePlayers[playerId];
    }
  });

  socket.on('gameStateUpdate', (gameState) => {
    for (const playerState of gameState) {
        if (playerState.id === ownPlayerId) {
            if (PLAYER_INSTANCE && socket && socket.connected) {
                 PLAYER_INSTANCE.setHealth(playerState.health);
                 PLAYER_INSTANCE.setIsDead(playerState.isDead);
                 // Position/Rotation for local player will be set by server if we are NOT doing client-side prediction + server reconciliation
                 // For now, if online, server is authoritative.
                 PLAYER_INSTANCE.setPosition(playerState.x, playerState.y, playerState.z);
                 PLAYER_INSTANCE.setRotationY(playerState.rotY);
            }
        } else {
            if (remotePlayers[playerState.id]) {
                remotePlayers[playerState.id].setPosition(playerState.x, playerState.y, playerState.z);
                remotePlayers[playerState.id].setRotationY(playerState.rotY);
                remotePlayers[playerState.id].setHealth(playerState.health);
                remotePlayers[playerState.id].setIsDead(playerState.isDead);
            } else { // Player joined and we missed 'playerJoined' or this is initial sync
                const remotePlayer = new PlayerClass(gameScene, 'pharaoh', null, CONSTANTS);
                remotePlayer.characterGroup.name = `remote_player_${playerState.id}`;
                remotePlayer.setPosition(playerState.x, playerState.y, playerState.z);
                remotePlayer.setRotationY(playerState.rotY);
                remotePlayer.setHealth(playerState.health);
                remotePlayer.setIsDead(playerState.isDead);
                remotePlayers[playerState.id] = remotePlayer;
                console.log('Created remote player from game state update:', playerState.id);
            }
        }
    }
  });

  socket.on('gameEffect', (effectData) => {
    if (effectData.type === "musket_fire") {
        console.log("Client: Received musket_fire effect from player:", effectData.playerId);
        let effectOrigin = new THREE.Vector3(effectData.origin.x, effectData.origin.y, effectData.origin.z);
        let effectDirection = new THREE.Vector3(effectData.direction.x, effectData.direction.y, effectData.direction.z);

        // The complex origin adjustment logic was removed as per instructions.
        // Server's effectData.origin is used directly.
        createMusketFireEffect(effectOrigin, effectDirection);
    }
  });

  socket.on('playerRespawned', (playerData) => {
    console.log('Player respawned:', playerData);
    let targetPlayer = null;
    if (playerData.id === ownPlayerId) {
        targetPlayer = PLAYER_INSTANCE;
    } else {
        targetPlayer = remotePlayers[playerData.id];
    }

    if (targetPlayer) {
        targetPlayer.setPosition(playerData.x, playerData.y, playerData.z);
        targetPlayer.setRotationY(playerData.rotY);
        targetPlayer.setHealth(playerData.health);
        targetPlayer.setIsDead(false);
        if (targetPlayer.characterGroup) {
            targetPlayer.characterGroup.visible = true;
        }
    } else if (playerData.id !== ownPlayerId) { // If a remote player respawned but wasn't in remotePlayers
        console.log('Respawned remote player not found locally, creating:', playerData.id);
        const remotePlayer = new PlayerClass(gameScene, 'pharaoh', null, CONSTANTS);
        remotePlayer.characterGroup.name = `remote_player_${playerData.id}`;
        remotePlayer.setPosition(playerData.x, playerData.y, playerData.z);
        remotePlayer.setRotationY(playerData.rotY);
        remotePlayer.setHealth(playerData.health);
        remotePlayer.setIsDead(false); // Ensure they are marked as not dead
        remotePlayers[playerData.id] = remotePlayer;
    }
  });


} catch (e) {
  console.error("Socket.IO client library not found or failed to initialize:", e);
}

function initGame() {
    const rendererData = initRenderer(document.body);
    gameScene = rendererData.scene;
    gameRendererDOM = rendererData.rendererDOM;

    INPUT_MANAGER.initKeyListeners();
    INPUT_MANAGER.initMouseListeners(gameRendererDOM);

    const particleInitData = PARTICLE_SYSTEMS.initAllParticleSystems(gameScene, CONSTANTS);
    gunGlowParticlesObject = particleInitData.gunGlowParticlesObject;

    PLAYER_INSTANCE = new PlayerClass(gameScene, 'pharaoh', gunGlowParticlesObject, CONSTANTS);
    WORLD_INSTANCE = new WorldClass(gameScene, CONSTANTS);

    mainAnimateLoop();
}

function mainAnimateLoop() {
    requestAnimationFrame(mainAnimateLoop);
    const delta = GAMELOGIC_INSTANCE.clock.getDelta();
    let playerMovementData = {isMoving: false, intendedDisplacement: new THREE.Vector3(), effectiveMoveDir: null};

    if (socket && socket.connected && ownPlayerId) {
        const currentKeys = INPUT_MANAGER.getKeys();
        const currentCameraRotation = INPUT_MANAGER.getCameraRotationAngle();

        socket.emit('playerInput', {
            keys: currentKeys,
            cameraRotation: currentCameraRotation
        });

        if (INPUT_MANAGER.isKeyJustPressed('f')) {
            const aimDirection = new THREE.Vector3();
            RENDERER_CAMERA_INSTANCE.getWorldDirection(aimDirection);

            socket.emit('playerAction', {
                action: "fire_musket",
                direction: { x: aimDirection.x, y: aimDirection.y, z: aimDirection.z }
            });
            // console.log("Client: Sent fire_musket action", aimDirection); // Keep for debugging if needed
        }

        // If server is authoritative for movement, local player's animation might be driven by its current velocity or state
        // which is updated by gameStateUpdate. For immediate feedback on key presses before server state arrives,
        // we can still update animations locally.
        // This part of playerMovementData is for local effects like particles.
        if (currentKeys.w || currentKeys.a || currentKeys.s || currentKeys.d) {
            playerMovementData.isMoving = true;
        }
        // Local player animation update based on current input (for responsiveness)
        // This is a simplified version that doesn't predict position, just animation state.
        PLAYER_INSTANCE.handlePlayerMovementAndAnimation(delta, currentKeys, RENDERER_CAMERA_INSTANCE, GAMELOGIC_INSTANCE.clock, UTILS.lerpAngles);


    } else { // Offline or not yet initialized
        playerMovementData = PLAYER_INSTANCE.handlePlayerMovementAndAnimation(
            delta, INPUT_MANAGER.getKeys(),
            RENDERER_CAMERA_INSTANCE,
            GAMELOGIC_INSTANCE.clock,
            UTILS.lerpAngles
        );

        let proposedFullPosition = new THREE.Vector3(
            PLAYER_INSTANCE.characterGroup.position.x + playerMovementData.intendedDisplacement.x,
            PLAYER_INSTANCE.characterGroup.position.y,
            PLAYER_INSTANCE.characterGroup.position.z + playerMovementData.intendedDisplacement.z
        );

        const terrainInfo = GAMELOGIC_INSTANCE.handleCollisionsAndTerrain(
            PLAYER_INSTANCE.characterGroup, proposedFullPosition, WORLD_INSTANCE.collidableMeshes,
            CONSTANTS.mapHalfSize, CONSTANTS.characterCollisionRadius
        );

        PLAYER_INSTANCE.characterGroup.position.x = terrainInfo.correctedPos.x;
        PLAYER_INSTANCE.characterGroup.position.z = terrainInfo.correctedPos.z;
        PLAYER_INSTANCE.updateVerticalState(delta, terrainInfo.floorY);

        if (playerMovementData.effectiveMoveDir && playerMovementData.effectiveMoveDir.lengthSq() > 0) {
             const targetRotationY = Math.atan2(playerMovementData.effectiveMoveDir.x, playerMovementData.effectiveMoveDir.z);
             PLAYER_INSTANCE.characterGroup.rotation.y = UTILS.lerpAngles(PLAYER_INSTANCE.characterGroup.rotation.y, targetRotationY, 0.1);
        }
    }

    WORLD_INSTANCE.updateWorldAnimations(delta, GAMELOGIC_INSTANCE.clock);

    PARTICLE_SYSTEMS.windSystem.update(delta, PLAYER_INSTANCE.characterGroup.position);
    PARTICLE_SYSTEMS.kickUpSystem.update(delta, PLAYER_INSTANCE.characterGroup.position, playerMovementData.isMoving);

    if (PLAYER_INSTANCE.pharaohGun && PLAYER_INSTANCE.pharaohGun.getObjectByProperty('type', 'Points')) {
         PARTICLE_SYSTEMS.gunGlowEffect.update(delta);
    }

    let redHeartPos = WORLD_INSTANCE.redCrystalHeart ? WORLD_INSTANCE.redCrystalHeart.getWorldPosition(new THREE.Vector3()) : null;
    PARTICLE_SYSTEMS.redShrineSystem.update(delta, redHeartPos);
    let blueHeartPos = WORLD_INSTANCE.blueCrystalHeart ? WORLD_INSTANCE.blueCrystalHeart.getWorldPosition(new THREE.Vector3()) : null;
    PARTICLE_SYSTEMS.blueShrineSystem.update(delta, blueHeartPos);

    if (socket && socket.connected && ownPlayerId) {
        GAMELOGIC_INSTANCE.updateShrineInteractions(
            delta, PLAYER_INSTANCE.characterGroup, WORLD_INSTANCE.redCrystalHeart,
            PLAYER_INSTANCE, WORLD_INSTANCE, gameScene,
            INPUT_MANAGER.getCameraRotationAngle.bind(INPUT_MANAGER),
            INPUT_MANAGER.setCameraRotationAngle.bind(INPUT_MANAGER),
            gunGlowParticlesObject,
            WORLD_INSTANCE.townCenter
        );
    }

    updateCameraAndSpotlight(PLAYER_INSTANCE.characterGroup, INPUT_MANAGER.getCameraRotationAngle());
    renderScene();

    INPUT_MANAGER.updatePrevKeys();
}
initGame();
