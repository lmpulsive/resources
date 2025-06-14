const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
let players = {};

// Server-side constants from before (map size, etc.)
const SERVER_MAP_HALF_SIZE = 100;
const SERVER_CHARACTER_COLLISION_RADIUS = 0.5;
const SERVER_PLAYER_MOVE_SPEED = 5;
const SERVER_GRAVITY = -25;
const SERVER_JUMP_SPEED = 15;

// --- Game Phase Management ---
const GamePhases = {
    WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
    GAME_COUNTDOWN: 'GAME_COUNTDOWN',
    ROUND_IN_PROGRESS: 'ROUND_IN_PROGRESS',
    ROUND_END: 'ROUND_END',
    POST_ROUND_STATS: 'POST_ROUND_STATS'
};

let currentPhase = GamePhases.WAITING_FOR_PLAYERS;
let phaseStartTime = Date.now(); // Timestamp for when the current phase started

// Configuration for phase transitions and durations
const MIN_PLAYERS_TO_START = 2; // Minimum players to start the countdown
const COUNTDOWN_DURATION_SECONDS = 10;
const ROUND_DURATION_SECONDS = 180; // 3 minutes
const ROUND_END_MESSAGE_DURATION_SECONDS = 5; // How long to show "Round End"
const POST_ROUND_STATS_DURATION_SECONDS = 10; // How long to show stats

// Timers will be managed within the main game loop by checking elapsed time
// No need for separate setInterval IDs for these specific timers if using elapsed time logic.
// let countdownEndTime = 0; // Will be set when countdown starts
// let roundEndTime = 0;     // Will be set when round starts

// --- End Game Phase Management ---

const PLAYER_RESPAWN_DELAY_SECONDS = 5; // Example: 5 seconds, can be adjusted

const SPAWN_ZONES = [
    { x: 0, z: 0, radius: 5 },    // Example: Center zone
    { x: 50, z: 50, radius: 8 },   // Example: Corner 1
    { x: -50, z: 50, radius: 8 },  // Example: Corner 2
    { x: 50, z: -50, radius: 8 },  // Example: Corner 3
    { x: -50, z: -50, radius: 8 }  // Example: Corner 4
    // Add more or adjust as needed. Ensure these are within SERVER_MAP_HALF_SIZE boundaries.
];
if (SPAWN_ZONES.length === 0) {
    console.warn("SPAWN_ZONES array is empty! Defaulting to a single spawn zone at (0,0).");
    SPAWN_ZONES.push({ x: 0, z: 0, radius: 5});
}

class ServerPlayer {
    constructor(id, x = 0, y = 0, z = 0) {
        this.id = id;
        this.x = x; this.y = y; this.z = z;
        this.rotY = 0;
        this.health = 100;
        this.isDead = false;

        this.keys = { w:false, a:false, s:false, d:false, ' ':false };
        this.cameraRotation = 0;

        this.velocityY = 0;
        this.isJumpingServer = false;

        this.deathTimestamp = null; // Added for new respawn logic
    }
}

app.get('/', (req, res) => {
  res.send('<h1>Winter3D Game Server</h1><p>Socket.IO is active.</p>');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  const spawnX = Math.random() * 10 - 5; // Initial spawn, will be overridden if joining mid-game
  const spawnZ = Math.random() * 10 - 5;
  const newPlayer = new ServerPlayer(socket.id, spawnX, 0, spawnZ);

  if (currentPhase === GamePhases.ROUND_IN_PROGRESS ||
      currentPhase === GamePhases.ROUND_END ||
      currentPhase === GamePhases.POST_ROUND_STATS ) {
      console.log(`Player ${socket.id} joined mid-game (phase: ${currentPhase}). Setting to await next round/respawn.`);
      newPlayer.isDead = true;
      newPlayer.health = 0;
      newPlayer.deathTimestamp = Date.now();
  }
  players[socket.id] = newPlayer;

  socket.emit('initializePlayer', { id: newPlayer.id, initialState: newPlayer });
  socket.broadcast.emit('playerJoined', newPlayer);
  for (const playerId in players) {
    if (playerId !== socket.id) {
      socket.emit('playerJoined', players[playerId]);
    }
  }
  // Immediately inform the new player about the current game phase and time remaining in it
  socket.emit('gamePhaseUpdate', {
    phase: currentPhase,
    startTime: phaseStartTime,
    // Send specific durations for client-side timers if needed
    countdownDuration: COUNTDOWN_DURATION_SECONDS,
    roundDuration: ROUND_DURATION_SECONDS,
    roundEndMsgDuration: ROUND_END_MESSAGE_DURATION_SECONDS,
    postRoundStatsDuration: POST_ROUND_STATS_DURATION_SECONDS
  });


  socket.on('disconnect', () => {
    const disconnectedPlayerId = socket.id;
    console.log('User disconnected:', disconnectedPlayerId);

    if (players[disconnectedPlayerId]) {
        delete players[disconnectedPlayerId];
        io.emit('playerLeft', disconnectedPlayerId);

        // Check if game phase should change due to player leaving
        if ((currentPhase === GamePhases.GAME_COUNTDOWN || currentPhase === GamePhases.ROUND_IN_PROGRESS) &&
            Object.keys(players).length < MIN_PLAYERS_TO_START) {

            console.log('Not enough players to continue current game phase. Returning to WAITING_FOR_PLAYERS.');
            changeGamePhase(GamePhases.WAITING_FOR_PLAYERS);
        }
    }
  });

  socket.on('playerInput', (inputData) => {
    if (players[socket.id] && currentPhase === GamePhases.ROUND_IN_PROGRESS) { // Only process input if round is in progress
        players[socket.id].keys = inputData.keys;
        players[socket.id].rotY = inputData.cameraRotation;
    }
  });

  socket.on('playerAction', (actionData) => {
    const firingPlayer = players[socket.id];
    // Only allow actions if round is in progress and player is not dead
    if (!firingPlayer || firingPlayer.isDead || currentPhase !== GamePhases.ROUND_IN_PROGRESS) {
        return;
    }

    if (actionData.action === "fire_musket") {
        console.log(`Player ${socket.id} fired musket. Direction:`, actionData.direction);

        const fireOrigin = { x: firingPlayer.x, y: firingPlayer.y + 1.5, z: firingPlayer.z };
        const fireDirection = actionData.direction;

        let hitPlayerId = null;
        let hitDistance = Infinity;

        for (const targetPlayerId in players) {
            if (targetPlayerId === socket.id) continue;

            const targetPlayer = players[targetPlayerId];
            if (targetPlayer.isDead) continue;

            const targetSphereCenter = { x: targetPlayer.x, y: targetPlayer.y + 1.0, z: targetPlayer.z };
            const targetSphereRadius = SERVER_CHARACTER_COLLISION_RADIUS;

            const intersectionDistance = intersectRayWithSphere(fireOrigin, fireDirection, targetSphereCenter, targetSphereRadius);

            if (intersectionDistance !== null && intersectionDistance < hitDistance) {
                hitDistance = intersectionDistance;
                hitPlayerId = targetPlayerId;
            }
        }

        if (hitPlayerId) {
            const victim = players[hitPlayerId];
            const damage = 35;
            victim.health -= damage;
            console.log(`Player ${hitPlayerId} hit by ${socket.id}, health: ${victim.health}`);
            if (victim.health <= 0) {
                victim.health = 0; // Clamp health at 0
                victim.isDead = true;
                victim.deathTimestamp = Date.now(); // Record time of death

                console.log(`Player ${hitPlayerId} DIED. Timestamp: ${victim.deathTimestamp}`);
            }
        }

        io.emit('gameEffect', {
            type: "musket_fire",
            playerId: socket.id,
            origin: fireOrigin,
            direction: fireDirection
        });
    }
  });
});

// Ray-Sphere Intersection Helper Function
function intersectRayWithSphere(origin, direction, sphereCenter, sphereRadius) {
    const oc = { x: sphereCenter.x - origin.x, y: sphereCenter.y - origin.y, z: sphereCenter.z - origin.z };
    const tca = oc.x * direction.x + oc.y * direction.y + oc.z * direction.z;
    const d2 = (oc.x * oc.x + oc.y * oc.y + oc.z * oc.z) - tca * tca;
    const radius2 = sphereRadius * sphereRadius;
    if (d2 > radius2 || tca < 0 && Math.sqrt(d2) > sphereRadius) return null; // Ray misses or sphere is behind and ray doesn't start inside
    const thc = Math.sqrt(radius2 - d2);
    const t0 = tca - thc;
    const t1 = tca + thc;
    if (t0 < 0 && t1 < 0) return null;
    if (t0 < 0) return t1;
    return t0;
}

// Function to change game phase and broadcast
function changeGamePhase(newPhase) {
    console.log(`Game phase changing from ${currentPhase} to ${newPhase}`);
    currentPhase = newPhase;
    phaseStartTime = Date.now();
    io.emit('gamePhaseUpdate', {
        phase: currentPhase,
        startTime: phaseStartTime,
        countdownDuration: COUNTDOWN_DURATION_SECONDS,
        roundDuration: ROUND_DURATION_SECONDS,
        roundEndMsgDuration: ROUND_END_MESSAGE_DURATION_SECONDS,
        postRoundStatsDuration: POST_ROUND_STATS_DURATION_SECONDS
    });

    // Additional logic when a phase starts
    if (newPhase === GamePhases.ROUND_IN_PROGRESS) {
        // Reset players for the new round (already handled by countdown -> round_in_progress transition in updateGamePhase)
    } else if (newPhase === GamePhases.WAITING_FOR_PLAYERS) {
        // Reset scores or other states if necessary
    }
}

// Placeholder for the main game phase update logic
function updateGamePhase(now) {
    const elapsedTimeInPhaseSeconds = (now - phaseStartTime) / 1000.0;

    switch (currentPhase) {
        case GamePhases.WAITING_FOR_PLAYERS:
            if (Object.keys(players).length >= MIN_PLAYERS_TO_START) {
                changeGamePhase(GamePhases.GAME_COUNTDOWN);
            }
            break;
        case GamePhases.GAME_COUNTDOWN:
            if (elapsedTimeInPhaseSeconds >= COUNTDOWN_DURATION_SECONDS) {
                // Reset players for the new round
                for (const playerId in players) {
                    const player = players[playerId];
                    player.health = 100;
                    player.isDead = false;
                    player.deathTimestamp = null;
                    // Spawn in a random zone
                    if (SPAWN_ZONES.length > 0) {
                        const selectedZoneIndex = Math.floor(Math.random() * SPAWN_ZONES.length);
                        const selectedZone = SPAWN_ZONES[selectedZoneIndex];
                        const angle = Math.random() * 2 * Math.PI;
                        const dist = Math.random() * selectedZone.radius;
                        player.x = selectedZone.x + Math.cos(angle) * dist;
                        player.z = selectedZone.z + Math.sin(angle) * dist;
                    } else { // Fallback
                        player.x = Math.random() * 10 - 5;
                        player.z = Math.random() * 10 - 5;
                    }
                    player.y = 0;
                    player.rotY = 0; // Reset rotation on round start
                    player.velocityY = 0;
                    player.isJumpingServer = false;
                    player.keys = { w:false, a:false, s:false, d:false, ' ':false };
                }
                changeGamePhase(GamePhases.ROUND_IN_PROGRESS);
            }
            break;
        case GamePhases.ROUND_IN_PROGRESS:
            if (elapsedTimeInPhaseSeconds >= ROUND_DURATION_SECONDS) {
                changeGamePhase(GamePhases.ROUND_END);
            }
            // Additional round logic (e.g., checking win conditions) could go here
            break;
        case GamePhases.ROUND_END:
            if (elapsedTimeInPhaseSeconds >= ROUND_END_MESSAGE_DURATION_SECONDS) {
                changeGamePhase(GamePhases.POST_ROUND_STATS);
            }
            break;
        case GamePhases.POST_ROUND_STATS:
            if (elapsedTimeInPhaseSeconds >= POST_ROUND_STATS_DURATION_SECONDS) {
                changeGamePhase(GamePhases.WAITING_FOR_PLAYERS); // Loop back
            }
            break;
    }
}


const GAME_TICK_RATE = 30;
const TICK_INTERVAL = 1000 / GAME_TICK_RATE;
let lastTickTime = Date.now();

setInterval(() => {
  const now = Date.now();
  const delta = (now - lastTickTime) / 1000.0;
  lastTickTime = now;

  updateGamePhase(now); // Call the game phase update logic

  // Process player inputs and update positions only if round is in progress
  if (currentPhase === GamePhases.ROUND_IN_PROGRESS) {
    for (const playerId in players) {
      const player = players[playerId];
      if (player.isDead) continue;

      const playerForward = { x: Math.sin(player.rotY), z: Math.cos(player.rotY) };
      const playerRight = { x: Math.sin(player.rotY + Math.PI / 2), z: Math.cos(player.rotY + Math.PI / 2) };
      let intendedDz = 0; let intendedDx = 0;
      if (player.keys.w) intendedDz = 1; if (player.keys.s) intendedDz = -1;
      if (player.keys.a) intendedDx = -1; if (player.keys.d) intendedDx = 1;
      let actualMoveX = 0; let actualMoveZ = 0;
      if (intendedDz !== 0) { actualMoveX += playerForward.x * intendedDz; actualMoveZ += playerForward.z * intendedDz; }
      if (intendedDx !== 0) { actualMoveX += playerRight.x * intendedDx; actualMoveZ += playerRight.z * intendedDx; }
      const magnitude = Math.sqrt(actualMoveX * actualMoveX + actualMoveZ * actualMoveZ);
      if (magnitude > 0) { actualMoveX = (actualMoveX / magnitude); actualMoveZ = (actualMoveZ / magnitude); }
      player.x += actualMoveX * SERVER_PLAYER_MOVE_SPEED * delta;
      player.z += actualMoveZ * SERVER_PLAYER_MOVE_SPEED * delta;

      if (player.keys[' '] && !player.isJumpingServer && player.y <= 0) {
          player.isJumpingServer = true; player.velocityY = SERVER_JUMP_SPEED;
      }
      if (player.isJumpingServer) {
          player.y += player.velocityY * delta; player.velocityY += SERVER_GRAVITY * delta;
          if (player.y < 0) { player.y = 0; player.isJumpingServer = false; player.velocityY = 0; }
      } else if (player.y > 0) {
          player.velocityY += SERVER_GRAVITY * delta; player.y += player.velocityY * delta;
          if (player.y < 0) { player.y = 0; player.velocityY = 0; }
      } else { player.y = 0; player.velocityY = 0; }

      const maxPos = SERVER_MAP_HALF_SIZE - SERVER_CHARACTER_COLLISION_RADIUS;
      player.x = Math.max(-maxPos, Math.min(maxPos, player.x));
      player.z = Math.max(-maxPos, Math.min(maxPos, player.z));
      if (player.y < 0 && !player.isJumpingServer) player.y = 0;
    }
  }

  // --- Respawn Logic (should ideally run mainly during ROUND_IN_PROGRESS) ---
  if (currentPhase === GamePhases.ROUND_IN_PROGRESS) { // Only allow respawns into an active round
      for (const playerId in players) {
          const player = players[playerId];
          if (player.isDead) {
              const timeSinceDeathSeconds = (Date.now() - player.deathTimestamp) / 1000.0;
              if (timeSinceDeathSeconds >= PLAYER_RESPAWN_DELAY_SECONDS) {
                  // Time to respawn
                  if (SPAWN_ZONES.length > 0) {
                      const selectedZoneIndex = Math.floor(Math.random() * SPAWN_ZONES.length);
                      const selectedZone = SPAWN_ZONES[selectedZoneIndex];

                      const angle = Math.random() * 2 * Math.PI;
                      const dist = Math.random() * selectedZone.radius;

                      player.x = selectedZone.x + Math.cos(angle) * dist;
                      player.y = 0;
                      player.z = selectedZone.z + Math.sin(angle) * dist;
                      player.rotY = 0; // Reset rotation on respawn
                  } else {
                      player.x = Math.random() * 10 - 5;
                      player.y = 0;
                      player.z = Math.random() * 10 - 5;
                  }

                  player.health = 100;
                  player.isDead = false;
                  player.deathTimestamp = null;
                  player.velocityY = 0;
                  player.isJumpingServer = false;
                  // Reset input keys on respawn
                  player.keys = { w:false, a:false, s:false, d:false, ' ':false };

                  console.log(`Player ${player.id} respawned at x:${player.x.toFixed(2)}, z:${player.z.toFixed(2)}`);

                  io.emit('playerRespawned', {
                      id: player.id,
                      x: player.x,
                      y: player.y,
                      z: player.z,
                      rotY: player.rotY,
                      health: player.health,
                      isDead: player.isDead
                  });
              }
          }
      }
  } // End of if (currentPhase === GamePhases.ROUND_IN_PROGRESS) for respawn

  const gameState = [];
  for (const playerId in players) {
    const player = players[playerId];
    gameState.push({
      id: player.id, x: player.x, y: player.y, z: player.z,
      rotY: player.rotY, health: player.health, isDead: player.isDead
    });
  }

  if (gameState.length > 0 || currentPhase !== GamePhases.WAITING_FOR_PLAYERS) { // Send updates even if no players, if phase is not waiting
    io.emit('gameStateUpdate', gameState);
  }
}, TICK_INTERVAL);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
