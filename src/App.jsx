// src/App.jsx
import React, { useEffect, useMemo } from 'react';
import GameCanvas from './components/GameCanvas';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider, useGame } from './contexts/GameContext';
import { socket as socketInstance } from './socket';
import { Renderer as RendererClass } from '../../public/js/three/renderer.js'; // Assuming this is the R3F compatible one now
import { World as WorldClass } from '../../public/js/game/world.js'; // Vanilla JS World
import { Player as PlayerClass } from '../../public/js/game/player.js'; // Vanilla JS Player
import * as CONSTANTS from '../../public/js/game/constants.js'; // Vanilla JS Constants
import * as PARTICLE_SYSTEMS from '../../public/js/three/particleSystems.js'; // Vanilla JS Particle Systems

// App-level instances
let RENDERER_INSTANCE;
let PLAYER_INSTANCE;
let WORLD_INSTANCE;
let gameScene; // To be obtained from RENDERER_INSTANCE

function AppLogic({ worldInstance, playerInstance, rendererInstance }) {
  const {
    handleInitializePlayer,
    handlePlayerJoined,
    handlePlayerLeft,
    handleGameStateUpdate,
    handlePlayerRespawned,
    handleGameEffect
  } = useGame();

  useEffect(() => {
    if (!socketInstance.connected) {
        console.log("AppLogic: Attempting to connect socket...");
        socketInstance.connect();
    }

    function onConnect() { console.log('Socket connected (AppLogic)! ID:', socketInstance.id); }
    function onDisconnect(reason) { console.log('Socket disconnected (AppLogic). Reason:', reason); }
    function onConnectError(error) { console.error('Socket connection error (AppLogic):', error); }

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);

    socketInstance.on('initializePlayer', handleInitializePlayer);
    socketInstance.on('playerJoined', handlePlayerJoined);
    socketInstance.on('playerLeft', handlePlayerLeft);
    socketInstance.on('gameStateUpdate', handleGameStateUpdate);
    socketInstance.on('playerRespawned', handlePlayerRespawned);
    socketInstance.on('gameEffect', handleGameEffect);

    return () => {
      console.log("AppLogic: Cleaning up socket listeners...");
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('connect_error', onConnectError);
      socketInstance.off('initializePlayer', handleInitializePlayer);
      socketInstance.off('playerJoined', handlePlayerJoined);
      socketInstance.off('playerLeft', handlePlayerLeft);
      socketInstance.off('gameStateUpdate', handleGameStateUpdate);
      socketInstance.off('playerRespawned', handlePlayerRespawned);
      socketInstance.off('gameEffect', handleGameEffect);
    };
  }, [handleInitializePlayer, handlePlayerJoined, handlePlayerLeft, handleGameStateUpdate, handlePlayerRespawned, handleGameEffect]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      {/* Pass necessary instances to GameCanvas. GameCanvas itself doesn't use RENDERER_INSTANCE directly, but its children might */}
      <GameCanvas worldInstance={worldInstance} playerInstance={playerInstance} rendererInstance={rendererInstance} />
    </div>
  );
}

export default function App() {
  // Create instances here. useMemo ensures they are created only once.
  // The RENDERER_INSTANCE is problematic here if it appends to document.body directly in constructor.
  // For R3F, the Canvas is the renderer. This mixing is the core issue.
  // The original vanilla renderer.js is not compatible with R3F's Canvas.
  // We should be using R3F's rendering capabilities provided by <Canvas>.
  // The `RendererClass` import should point to the R3F-compatible one if available, or be removed if GameCanvas handles all.
  // For now, assuming GameCanvas takes over rendering.

  // Initialize vanilla JS helper classes that are still used for state/logic outside React/R3F.
  // These need a 'scene' if they add non-R3F managed objects, which they shouldn't if we migrate fully.
  // For now, we pass a dummy or null scene if their constructor expects it but won't use it for adding objects.
  // The R3F scene is managed by <Canvas>.

  const instances = useMemo(() => {
    // The vanilla JS classes might need a mock scene if they try to add objects directly.
    // If they are purely for logic and state, they might not need a THREE.Scene instance.
    // The R3F components will add to the R3F scene.
    // This is a transitional phase.

    // RENDERER_INSTANCE is effectively the <Canvas> component now.
    // We don't create a vanilla RendererClass instance for R3F.

    const tempSceneForVanillaClasses = new THREE.Scene(); // Temporary, if vanilla classes *must* have a scene.

    const particleInitData = PARTICLE_SYSTEMS.initAllParticleSystems(tempSceneForVanillaClasses, CONSTANTS);
    const gunGlowObj = particleInitData.gunGlowParticlesObject; // This is now {}

    const pInstance = new PlayerClass(tempSceneForVanillaClasses, 'pharaoh', gunGlowObj, CONSTANTS);
    const wInstance = new WorldClass(tempSceneForVanillaClasses, CONSTANTS);

    // Store for access if needed by other parts of the vanilla logic that might still exist
    // (e.g. if some logic in main.js for GameLoopLogic needs them)
    PLAYER_INSTANCE = pInstance;
    WORLD_INSTANCE = wInstance;

    return { player: pInstance, world: wInstance };
  }, []);


  useEffect(() => {
    return () => {
        if (socketInstance.connected) {
            console.log("App unmount: Disconnecting socket globally");
            socketInstance.disconnect();
        }
    };
  }, []);

  return (
    <SocketProvider>
      <GameProvider>
        {/* Pass WORLD_INSTANCE to AppLogic. PLAYER_INSTANCE is used by GameLoopLogic indirectly via GameCanvas. */}
        <AppLogic worldInstanceFromApp={instances.world} playerInstanceFromApp={instances.player} />
      </GameProvider>
    </SocketProvider>
  );
}
