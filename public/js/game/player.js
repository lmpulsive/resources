import * as THREE from 'three';
import * as CONSTANTS from './constants.js'; // Import all as CONSTANTS

class Player {
    constructor(scene, initialCharacterType = 'pharaoh', gunParticlesSystem, gameConstants) {
        this.scene = scene;
        this.gunParticlesSystem = gunParticlesSystem;
        this.constants = gameConstants;
        this.characterGroup = null;
        this.pharaohGun = null;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.health = 100;
        this.isDead = false;
        this.currentBody = null; this.currentHead = null; this.currentLeg1 = null; this.currentLeg2 = null; this.currentArm1 = null; this.currentArm2 = null;
        this._initialize(initialCharacterType);
    }

    _initialize(charType){
        if(charType==='pharaoh') this.characterGroup=this._createPharaohCharacter();
        else this.characterGroup=this._createPokemonLikeCharacter();
        this.characterGroup.position.set(0,0,0);
        this.scene.add(this.characterGroup);
        this._updateCharacterAnimationRefs();
        this.pharaohGun=this._createPharaohGun();
        if(this.currentArm2){
            this.pharaohGun.position.set(0,0,0.6);
            this.pharaohGun.rotation.set(0,0,0);
            this.currentArm2.add(this.pharaohGun);
        }
    }

    _updateCharacterAnimationRefs(){
        this.currentBody=null;this.currentHead=null;this.currentLeg1=null;this.currentLeg2=null;this.currentArm1=null;this.currentArm2=null;
        if(!this.characterGroup)return;
        const pbC=this.characterGroup.children.find(c=>c.userData.isPharaohBody);
        if(pbC){
            this.currentBody=pbC;
            this.currentHead=this.characterGroup.children.find(c=>c.userData.isPharaohHead);
            this.currentArm1=this.currentBody.children.find(c=>c.userData.isPharaohArm&&c.position.x<0);
            this.currentArm2=this.currentBody.children.find(c=>c.userData.isPharaohArm&&c.position.x>0);
            this.currentLeg1=this.currentBody.children.find(c=>c.userData.isPharaohLeg&&c.position.x<0);
            this.currentLeg2=this.currentBody.children.find(c=>c.userData.isPharaohLeg&&c.position.x>0);
        }else{
            const pokB=this.characterGroup.children.find(c=>c.geometry instanceof THREE.SphereGeometry&&c.position.y===1);
            if(pokB){
                this.currentBody=pokB;
                this.currentHead=this.characterGroup.children.find(c=>c.geometry instanceof THREE.SphereGeometry && c.position.y===2.2);
                this.currentLeg1=this.characterGroup.children.find(c=>c.geometry instanceof THREE.BoxGeometry && c.geometry.parameters.height===0.8 && c.position.x<0);
                this.currentLeg2=this.characterGroup.children.find(c=>c.geometry instanceof THREE.BoxGeometry && c.geometry.parameters.height===0.8 && c.position.x>0);
                this.currentArm1=this.characterGroup.children.find(c=>c.geometry instanceof THREE.BoxGeometry && c.geometry.parameters.height===1 && c.position.x<0);
                this.currentArm2=this.characterGroup.children.find(c=>c.geometry instanceof THREE.BoxGeometry && c.geometry.parameters.height===1 && c.position.x>0);
            }
        }
    }

    _createPharaohCharacter(){
        const p=new THREE.Group();
        const bP=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.4,0.6),CONSTANTS.bodyMaterial);
        bP.position.y=1;bP.castShadow=true;bP.receiveShadow=true;bP.userData.isPharaohBody=true;p.add(bP);
        const hP=new THREE.Mesh(new THREE.BoxGeometry(1,1.1,1),CONSTANTS.skinMaterial);
        hP.position.y=2.2;hP.castShadow=true;hP.receiveShadow=true;hP.userData.isPharaohHead=true;p.add(hP);
        const eyeG=new THREE.BoxGeometry(0.15,0.15,0.05);
        const e1=new THREE.Mesh(eyeG,CONSTANTS.faceFeatureMaterial);e1.position.set(-0.25,0.15,0.51);hP.add(e1);
        const e2=new THREE.Mesh(eyeG,CONSTANTS.faceFeatureMaterial);e2.position.set(0.25,0.15,0.51);hP.add(e2);
        const mouG=new THREE.BoxGeometry(0.3,0.1,0.05);
        const mou=new THREE.Mesh(mouG,CONSTANTS.faceFeatureMaterial);mou.position.set(0,-0.15,0.51);hP.add(mou);
        const hSBG=new THREE.ConeGeometry(0.25,1,4);const hSSG=new THREE.ConeGeometry(0.2,0.8,4);
        const sp1=new THREE.Mesh(hSBG,CONSTANTS.hairMaterial);sp1.position.set(0,0.8,-0.4);sp1.rotation.x=Math.PI/4;hP.add(sp1);
        const sp2=new THREE.Mesh(hSBG,CONSTANTS.hairMaterial);sp2.position.set(0.4,0.8,-0.2);sp2.rotation.x=Math.PI/4;sp2.rotation.y=Math.PI/4;hP.add(sp2);
        const sp3=new THREE.Mesh(hSBG,CONSTANTS.hairMaterial);sp3.position.set(-0.4,0.8,-0.2);sp3.rotation.x=Math.PI/4;sp3.rotation.y=-Math.PI/4;hP.add(sp3);
        const sp4=new THREE.Mesh(hSSG,CONSTANTS.hairMaterial);sp4.position.set(0.6,0.5,0);sp4.rotation.z=-Math.PI/2;hP.add(sp4);
        const sp5=new THREE.Mesh(hSSG,CONSTANTS.hairMaterial);sp5.position.set(-0.6,0.5,0);sp5.rotation.z=Math.PI/2;hP.add(sp5);
        const cB=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,0.2,6),CONSTANTS.goldMaterial);cB.position.y=0.5;hP.add(cB);
        const cFS=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.4,4),CONSTANTS.goldMaterial);cFS.position.set(0,0.6,0.5);cFS.rotation.x=-Math.PI/10;hP.add(cFS);
        const armG=new THREE.BoxGeometry(0.25,1,0.25);
        const aP1=new THREE.Mesh(armG,CONSTANTS.skinMaterial);aP1.position.set(-0.6,0.3,0);aP1.castShadow=true;aP1.userData.isPharaohArm=true;bP.add(aP1);
        const aP2=new THREE.Mesh(armG,CONSTANTS.skinMaterial);aP2.position.set(0.6,0.3,0);aP2.castShadow=true;aP2.userData.isPharaohArm=true;bP.add(aP2);
        const legG=new THREE.BoxGeometry(0.3,1.3,0.3);
        const lP1=new THREE.Mesh(legG,CONSTANTS.skinMaterial);lP1.position.set(-0.25,-0.7,0);lP1.castShadow=true;lP1.userData.isPharaohLeg=true;bP.add(lP1);
        const lP2=new THREE.Mesh(legG,CONSTANTS.skinMaterial);lP2.position.set(0.25,-0.7,0);lP2.castShadow=true;lP2.userData.isPharaohLeg=true;bP.add(lP2);
        const shPG=new THREE.BoxGeometry(0.5,0.2,0.8);
        const shP1=new THREE.Mesh(shPG,CONSTANTS.goldMaterial);shP1.position.set(-0.6,0.6,0);shP1.castShadow=true;bP.add(shP1);
        const shP2=new THREE.Mesh(shPG,CONSTANTS.goldMaterial);shP2.position.set(0.6,0.6,0);shP2.castShadow=true;bP.add(shP2);
        const braG=new THREE.BoxGeometry(0.28,0.4,0.28);
        const bra1=new THREE.Mesh(braG,CONSTANTS.goldMaterial);bra1.position.set(0,-0.3,0);bra1.castShadow=true;aP1.add(bra1);
        const bra2=new THREE.Mesh(braG,CONSTANTS.goldMaterial);bra2.position.set(0,-0.3,0);bra2.castShadow=true;aP2.add(bra2);
        const booG=new THREE.BoxGeometry(0.35,0.4,0.5);
        const boo1=new THREE.Mesh(booG,CONSTANTS.goldMaterial);boo1.position.set(0,-0.6,0);boo1.castShadow=true;lP1.add(boo1);
        const boo2=new THREE.Mesh(booG,CONSTANTS.goldMaterial);boo2.position.set(0,-0.6,0);boo2.castShadow=true;lP2.add(boo2);
        const belt=new THREE.Mesh(new THREE.BoxGeometry(1,0.2,0.7),CONSTANTS.goldMaterial);belt.position.y=0.4;belt.castShadow=true;bP.add(belt);
        const skirt=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.1),CONSTANTS.skirtMaterial);skirt.position.set(0,-0.3,0.3);skirt.rotation.x=-Math.PI/10;skirt.castShadow=true;bP.add(skirt);
        const capG=new THREE.Group();
        const capB=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.5,0.1),CONSTANTS.capeMaterial);capB.position.set(0,0.1,-0.7);capB.rotation.x=-Math.PI/12;capB.castShadow=true;capG.add(capB);
        const capFL=new THREE.Mesh(new THREE.BoxGeometry(1.2,1,0.1),CONSTANTS.capeMaterial);capFL.position.set(-1,0.5,-0.5);capFL.rotation.set(-Math.PI/8,-Math.PI/6,0);capFL.castShadow=true;capG.add(capFL);
        const capFR=new THREE.Mesh(new THREE.BoxGeometry(1.2,1,0.1),CONSTANTS.capeMaterial);capFR.position.set(1,0.5,-0.5);capFR.rotation.set(-Math.PI/8,Math.PI/6,0);capFR.castShadow=true;capG.add(capFR);
        bP.add(capG);
        return p;
    }

    _createPokemonLikeCharacter(){
        const cG=new THREE.Group();
        const bM=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),CONSTANTS.characterMaterial);bM.position.y=1;bM.castShadow=true;cG.add(bM);
        const hM=new THREE.Mesh(new THREE.SphereGeometry(0.7,8,8),CONSTANTS.characterMaterial);hM.position.y=2.2;hM.castShadow=true;cG.add(hM);
        const eG=new THREE.SphereGeometry(0.2,4,4);
        const e1=new THREE.Mesh(eG,CONSTANTS.characterMaterial);e1.position.set(-0.6,2.7,0);e1.castShadow=true;cG.add(e1);
        const e2=new THREE.Mesh(eG,CONSTANTS.characterMaterial);e2.position.set(0.6,2.7,0);e2.castShadow=true;cG.add(e2);
        const armG=new THREE.BoxGeometry(0.3,1,0.3);
        const aM1=new THREE.Mesh(armG,CONSTANTS.characterMaterial);aM1.position.set(-1.1,0,0);aM1.castShadow=true;cG.add(aM1);
        const aM2=new THREE.Mesh(armG,CONSTANTS.characterMaterial);aM2.position.set(1.1,0,0);aM2.castShadow=true;cG.add(aM2);
        const legG=new THREE.BoxGeometry(0.4,0.8,0.4);
        const lM1=new THREE.Mesh(legG,CONSTANTS.characterMaterial);lM1.position.set(-0.6,-0.4,0);lM1.castShadow=true;cG.add(lM1);
        const lM2=new THREE.Mesh(legG,CONSTANTS.characterMaterial);lM2.position.set(0.6,-0.4,0);lM2.castShadow=true;cG.add(lM2);
        return cG;
    }

    _createPharaohGun(){
        const gG=new THREE.Group();
        const r=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,1.5),CONSTANTS.mainGunMaterial);r.position.set(0,0,0);gG.add(r);
        const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.8,8),CONSTANTS.barrelMaterial);bar.position.set(0,0,0.75+0.4);bar.rotation.x=Math.PI/2;gG.add(bar);
        const muzG=new THREE.ConeGeometry(0.12,0.15,4);
        const muz=new THREE.Mesh(muzG,CONSTANTS.barrelMaterial);muz.position.set(0,0,bar.position.z+0.4);muz.rotation.x=Math.PI/2;gG.add(muz);
        const h=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.7,0.3),CONSTANTS.gripMaterial);h.position.set(0,-0.4,-0.4);h.rotation.x=Math.PI/10;gG.add(h);
        const mag=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.4,0.2),CONSTANTS.mainGunMaterial);mag.position.set(0,-0.3,-0.2);gG.add(mag);
        const scoB=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,0.5),CONSTANTS.accentMaterial);scoB.position.set(0,0.25,0.3);gG.add(scoB);
        const scoL=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.1,8),CONSTANTS.barrelMaterial);scoL.position.set(0,0.25,0.55);scoL.rotation.x=Math.PI/2;gG.add(scoL);
        const fGG=new THREE.BufferGeometry();const fGV=new Float32Array([-0.15,0.1,0.5,0.15,0.1,0.5,0.1,-0.2,0.5,-0.1,-0.2,0.5,-0.1,0.05,0.2,0.1,0.05,0.2,0.08,-0.15,0.2,-0.08,-0.15,0.2]);const fGI=new Uint16Array([0,1,2,0,2,3,4,5,6,4,6,7,0,4,7,0,7,3,1,5,6,1,6,2,0,1,5,0,5,4,3,2,6,3,6,7]);fGG.setAttribute('position',new THREE.BufferAttribute(fGV,3));fGG.setIndex(new THREE.BufferAttribute(fGI,1));fGG.computeVertexNormals();
        const fG=new THREE.Mesh(fGG,CONSTANTS.accentMaterial);fG.position.set(0,-0.1,0.2);gG.add(fG);
        const pyrG=new THREE.ConeGeometry(0.15,0.15,4);
        const pyrC=new THREE.Mesh(pyrG,CONSTANTS.pyramidMaterial);pyrC.position.set(0.1,-0.3,0.4);pyrC.rotation.x=Math.PI/2;gG.add(pyrC);
        if(this.gunParticlesSystem){gG.add(this.gunParticlesSystem);}
        return gG;
    }

    setPlayerCharacterGroup(newCharType,townCenter, gunParticlesObject){
        if(this.characterGroup){this.scene.remove(this.characterGroup);this.characterGroup.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.isMaterial)o.material.dispose();else if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());}}); }

        this.gunParticlesSystem = gunParticlesObject;

        if(newCharType==='pharaoh')this.characterGroup=this._createPharaohCharacter();
        else this.characterGroup=this._createPokemonLikeCharacter();
        this.characterGroup.position.copy(townCenter);
        this.scene.add(this.characterGroup);
        this._updateCharacterAnimationRefs();

        if(this.currentArm2&&this.pharaohGun){
            this.currentArm2.remove(this.pharaohGun);
            this.pharaohGun.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.material.isMaterial)o.material.dispose();else if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());}});
        }
        this.pharaohGun=this._createPharaohGun();

        this._updateCharacterAnimationRefs();
        if(this.currentArm2){
            this.currentArm2.add(this.pharaohGun);
            this.pharaohGun.position.set(0,0,0.6);
        }
        this.isJumping=false;this.jumpVelocity=0;
    }

    handlePlayerMovementAndAnimation(delta,keysPressed,camera,clockRef,lerpAnglesFunc){
        if(!this.characterGroup)return{isMoving:false,intendedDisplacement:new THREE.Vector3(),effectiveMoveDir:null};
        const mS=(this.constants.moveSpeed || 12)*delta; // Use moveSpeed from constants
        let iM=false;
        const aIJS=this.constants.initialJumpSpeed;

        if(keysPressed[' ']&&!this.isJumping&&this.characterGroup.position.y<= ( (this.constants.groundYLevel || 0) + 0.05 ) ){
            this.isJumping=true;
            this.jumpVelocity=aIJS;
        }

        let mD=new THREE.Vector3();let tCD=new THREE.Vector3();camera.getWorldDirection(tCD);tCD.y=0;tCD.normalize();let rD=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tCD).normalize();let dz=0,dx=0;if(keysPressed['w'])dz=1;if(keysPressed['s'])dz=-1;if(keysPressed['a'])dx=-1;if(keysPressed['d'])dx=1;if(dx!==0||dz!==0){iM=true;let fM=tCD.clone().multiplyScalar(dz);let rM=rD.clone().multiplyScalar(-dx);mD.add(fM).add(rM).normalize();}
        const intDisp=mD.multiplyScalar(mS);
        let effMD=null;

        if(this.isJumping){
            if(this.currentLeg1)this.currentLeg1.rotation.x=-Math.PI/6;if(this.currentLeg2)this.currentLeg2.rotation.x=-Math.PI/6;
            if(this.currentArm1)this.currentArm1.rotation.x=Math.PI/8;if(this.currentArm2)this.currentArm2.rotation.x=Math.PI/8;
            if(this.currentHead)this.currentHead.rotation.x=0;
        }else if(iM){
            const rP=clockRef.getElapsedTime()*18;const sA=0.5;
            if(this.currentLeg1)this.currentLeg1.rotation.x=Math.sin(rP)*sA;if(this.currentLeg2)this.currentLeg2.rotation.x=-Math.sin(rP)*sA;
            const arSA=0.4;
            if(this.currentArm1)this.currentArm1.rotation.x=Math.sin(rP+Math.PI/2)*arSA;if(this.currentArm2)this.currentArm2.rotation.x=-Math.sin(rP+Math.PI/2)*arSA;
            if(this.currentHead)this.currentHead.rotation.x=Math.sin(rP*0.5)*0.12;
        }else{
            const iCS=2;const iP=clockRef.getElapsedTime()*iCS;
            if(this.currentLeg1)this.currentLeg1.rotation.x=0;if(this.currentLeg2)this.currentLeg2.rotation.x=0;
            if(this.currentArm1)this.currentArm1.rotation.x=0;if(this.currentArm2)this.currentArm2.rotation.x=0;
            if(this.currentHead)this.currentHead.rotation.x=Math.sin(iP*1.5)*0.02;
        }
        if(iM){effMD=intDisp.clone().normalize();}
        return{isMoving:iM,intendedDisplacement:intDisp,effectiveMoveDir:effMD};
    }

    updateVerticalState(delta, terrainFloorY) {
        const actualGravity = this.constants.gravity;
        const epsilon = 0.01;

        if (this.isJumping) {
            this.characterGroup.position.y += this.jumpVelocity * delta;
            this.jumpVelocity += actualGravity * delta;

            if (this.characterGroup.position.y <= terrainFloorY && this.jumpVelocity <= 0) {
                this.characterGroup.position.y = terrainFloorY;
                this.isJumping = false;
                this.jumpVelocity = 0;
                this.land();
            }
        } else {
            if (this.characterGroup.position.y > terrainFloorY + epsilon) {
                this.characterGroup.position.y += actualGravity * delta;
                if (this.characterGroup.position.y < terrainFloorY) {
                    this.characterGroup.position.y = terrainFloorY;
                    this.land();
                }
            } else if (this.characterGroup.position.y < terrainFloorY - epsilon) {
                 this.characterGroup.position.y = terrainFloorY;
            } else {
                this.characterGroup.position.y = terrainFloorY;
            }
        }
    }

    land() {
        // console.log("Player landed at Y:", this.characterGroup.position.y);
    }

    setPosition(x, y, z) {
        if (this.characterGroup) {
            this.characterGroup.position.set(x, y, z);
        }
    }

    setRotationY(rotY) {
        if (this.characterGroup) {
            this.characterGroup.rotation.y = rotY;
        }
    }

    setHealth(newHealth) {
        this.health = newHealth;
        // console.log(`Player ${this.characterGroup ? this.characterGroup.uuid : 'unknown'} health set to: ${this.health}`);
    }

    setIsDead(deadStatus) {
        this.isDead = deadStatus;
        if (this.characterGroup) {
            this.characterGroup.visible = !this.isDead;
            if (this.isDead) {
                // console.log(`Player ${this.characterGroup.uuid} is DEAD`);
            } else {
                // console.log(`Player ${this.characterGroup.uuid} is ALIVE`);
            }
        }
    }
}
export { Player };
