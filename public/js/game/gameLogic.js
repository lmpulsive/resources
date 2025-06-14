import * as THREE from 'three'; // Or ensure THREE is globally available

class GameLogic {
    constructor() {
        this.clock = new THREE.Clock();
        this.isInRedShrine = false;
        this.redShrineTimer = 0;
    }

    handleCollisionsAndTerrain(characterGroup, proposedPosition, collidableMeshes, mapHalfSizeFromConstants, charCollisionRadiusFromConstants) {
        // (Full existing logic of handleCollisionsAndTerrain)
        // This method does not use 'this.clock', 'this.isInRedShrine', or 'this.redShrineTimer'
        // So its internal logic remains the same.
        let finalPosition = proposedPosition.clone();
        let highestMountainY = 0;
        const charRadius = charCollisionRadiusFromConstants;
        const mapHalf = mapHalfSizeFromConstants;

        for (const obstacleMesh of collidableMeshes) {
            if (!obstacleMesh.userData.isCollidable) continue;
            const obstacleWorldPos = obstacleMesh.getWorldPosition(new THREE.Vector3());
            const collisionType = obstacleMesh.userData.collisionType;

            if (collisionType === 'sphere') {
                const obstacleRadius = obstacleMesh.userData.collisionRadius;
                const combinedRadius = charRadius + obstacleRadius;
                const potentialCharCenterXZ = new THREE.Vector2(finalPosition.x, finalPosition.z);
                const obstacleCenterXZ = new THREE.Vector2(obstacleWorldPos.x, obstacleWorldPos.z);
                const distanceXZ = potentialCharCenterXZ.distanceTo(obstacleCenterXZ);
                if (distanceXZ < combinedRadius) {
                    const overlap = combinedRadius - distanceXZ;
                    const normalXZ = new THREE.Vector2(potentialCharCenterXZ.x - obstacleCenterXZ.x, potentialCharCenterXZ.y - obstacleCenterXZ.y).normalize();
                    finalPosition.x += normalXZ.x * overlap;
                    finalPosition.z += normalXZ.y * overlap;
                }
            } else if (collisionType === 'cone') {
                const mountainRadius = obstacleMesh.userData.radius;
                const mountainHeight = obstacleMesh.userData.height;
                const mountainBaseY = obstacleMesh.userData.baseY !== undefined ? obstacleMesh.userData.baseY : obstacleWorldPos.y - mountainHeight / 2;
                const dx = finalPosition.x - obstacleWorldPos.x;
                const dz = finalPosition.z - obstacleWorldPos.z;
                const distXZ = Math.sqrt(dx*dx + dz*dz);

                if (distXZ <= mountainRadius + charRadius) {
                    let targetMountainY = mountainBaseY;
                    if (distXZ < mountainRadius) {
                        targetMountainY = mountainBaseY + mountainHeight * (1 - distXZ / mountainRadius);
                    }
                    highestMountainY = Math.max(highestMountainY, targetMountainY);
                    if (distXZ > mountainRadius - charRadius && proposedPosition.y < targetMountainY + charRadius) {
                         const overlap = (charRadius + mountainRadius) - distXZ;
                         if (overlap > 0) {
                             const pushOutDirection = new THREE.Vector3(dx,0,dz).normalize().multiplyScalar(overlap);
                             finalPosition.x += pushOutDirection.x;
                             finalPosition.z += pushOutDirection.z;
                         }
                    }
                }
            }
        }

        if (highestMountainY > 0) {
             finalPosition.y = highestMountainY;
        } else {
             finalPosition.y = 0;
        }

        finalPosition.x = Math.max(-mapHalf + charRadius, Math.min(mapHalf - charRadius, finalPosition.x));
        finalPosition.z = Math.max(-mapHalf + charRadius, Math.min(mapHalf - charRadius, finalPosition.z));

        return { correctedPos: finalPosition, floorY: finalPosition.y };
    }

    updateShrineInteractions(delta, characterGroup, redCrystalHeartWorld,
                             playerInstance, worldInstance, sceneRef,
                             getCameraRotationAngleFunc, setCameraRotationAngleFunc,
                             gunGlowSystem, // This was particleSystemsModule before, if it's just gunGlow, name it specifically
                             townCenterVec3) {
        // This method will now use 'this.isInRedShrine' and 'this.redShrineTimer'
        if (!redCrystalHeartWorld || !characterGroup || !playerInstance || !worldInstance || !sceneRef || !gunGlowSystem || !townCenterVec3 ) return;

        const redShrineRespawnDelay = (playerInstance.constants && playerInstance.constants.redShrineRespawnDelay) ? playerInstance.constants.redShrineRespawnDelay : 3;

        const distanceToRedShrine = characterGroup.position.distanceTo(redCrystalHeartWorld.getWorldPosition(new THREE.Vector3()));
        const interactionRadius = (playerInstance.constants && playerInstance.constants.shrineInteractionRadius) ? playerInstance.constants.shrineInteractionRadius : 3;


        if (distanceToRedShrine < interactionRadius) {
            if (!this.isInRedShrine) {
                this.isInRedShrine = true;
                this.redShrineTimer = 0;
            }
            this.redShrineTimer += delta;
            if (this.redShrineTimer >= redShrineRespawnDelay) {
                // Pass the already existing gunGlowSystem (which is PARTICLE_SYSTEMS.gunGlowParticles)
                playerInstance.setPlayerCharacterGroup('pharaoh', townCenterVec3, gunGlowSystem);
                if(setCameraRotationAngleFunc) setCameraRotationAngleFunc(0);
                this.redShrineTimer = 0;
                this.isInRedShrine = false;
            }
        } else {
            if (this.isInRedShrine) {
                this.isInRedShrine = false;
                this.redShrineTimer = 0;
            }
        }
    }
}

const gameLogicInstance = new GameLogic();
export default gameLogicInstance;
