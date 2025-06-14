// src/contexts/GameContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import * as THREE from 'three'; // Import THREE for MathUtils and Vector3

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [ownPlayerId, setOwnPlayerId] = useState(null);
  const [players, setPlayers] = useState({});
  const [activeEffects, setActiveEffects] = useState([]);

  // New state for shrine heart positions
  const [redHeartPosition, setRedHeartPosition] = useState(null);
  const [blueHeartPosition, setBlueHeartPosition] = useState(null);

  const handleInitializePlayer = useCallback((data) => {
    console.log('GameContext: Initializing player', data);
    setOwnPlayerId(data.id);
    setPlayers(prev => ({
      ...prev,
      [data.id]: { ...data.initialState, isLocal: true }
    }));
  }, []);

  const handlePlayerJoined = useCallback((playerData) => {
    console.log('GameContext: Player joined', playerData);
    if (playerData.id === ownPlayerId) return;
    setPlayers(prev => ({
      ...prev,
      [playerData.id]: { ...playerData, isLocal: false }
    }));
  }, [ownPlayerId]);

  const handlePlayerLeft = useCallback((playerId) => {
    console.log('GameContext: Player left', playerId);
    setPlayers(prev => {
      const newPlayers = { ...prev };
      delete newPlayers[playerId];
      return newPlayers;
    });
  }, []);

  const handleGameStateUpdate = useCallback((gameState) => {
    setPlayers(prev => {
      const updatedPlayers = { ...prev };
      for (const playerState of gameState) {
        if (updatedPlayers[playerState.id]) {
          updatedPlayers[playerState.id] = {
            ...updatedPlayers[playerState.id],
            ...playerState
          };
        } else {
          updatedPlayers[playerState.id] = {
            ...playerState,
            isLocal: playerState.id === ownPlayerId
          };
        }
      }
      return updatedPlayers;
    });
  }, [ownPlayerId]);

  const handlePlayerRespawned = useCallback((playerData) => {
    console.log('GameContext: Player respawned', playerData);
     setPlayers(prev => ({
        ...prev,
        [playerData.id]: {
            ...(prev[playerData.id] || {}),
            ...playerData,
            isLocal: playerData.id === ownPlayerId
        }
    }));
  }, [ownPlayerId]);

  const handleGameEffect = useCallback((effectData) => {
    console.log('GameContext: Game effect received', effectData);
    if (effectData.type === "musket_fire") {
      setActiveEffects(prevEffects => [
        ...prevEffects,
        {
          id: THREE.MathUtils.generateUUID(),
          type: effectData.type,
          position: new THREE.Vector3(effectData.origin.x, effectData.origin.y, effectData.origin.z),
          direction: new THREE.Vector3(effectData.direction.x, effectData.direction.y, effectData.direction.z),
        }
      ]);
    }
  }, []);

  const removeEffect = useCallback((effectId) => {
    setActiveEffects(prevEffects => prevEffects.filter(effect => effect.id !== effectId));
  }, []);

  // New handler for updating heart positions
  const updateHeartPosition = useCallback((heartType, position) => {
    if (heartType === 'red') {
      setRedHeartPosition(position ? new THREE.Vector3(position.x, position.y, position.z) : null);
    } else if (heartType === 'blue') {
      setBlueHeartPosition(position ? new THREE.Vector3(position.x, position.y, position.z) : null);
    }
  }, []);

  const value = {
    ownPlayerId,
    players,
    activeEffects,
    redHeartPosition,     // Added
    blueHeartPosition,    // Added
    handleInitializePlayer,
    handlePlayerJoined,
    handlePlayerLeft,
    handleGameStateUpdate,
    handlePlayerRespawned,
    handleGameEffect,
    removeEffect,
    updateHeartPosition,  // Added
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
