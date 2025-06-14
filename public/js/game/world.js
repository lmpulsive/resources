import * as THREE from 'three';
import * as CONSTANTS from './constants.js'; // Import all as CONSTANTS

class World {
    constructor(scene, gameConstants) { // gameConstants is CONSTANTS module
        this.scene=scene;
        this.constants=gameConstants; // Store game constants
        this.collidableMeshes=[];
        this.blueCrystalHeart=null;
        this.redCrystalHeart=null;
        this.blueFloatingOrbs=[];
        this.redFloatingOrbs=[];
        this.townCenter=new THREE.Vector3(0,0,0);
        // Materials are now accessed via this.constants
        this._populate();
    }

    _createTree(x,z){
        const t=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,2,8),this.constants.trunkMaterial);
        t.position.set(x,1,z);t.castShadow=true;t.receiveShadow=true;this.scene.add(t);
        const l=new THREE.Mesh(new THREE.ConeGeometry(1,3,8),this.constants.leavesMaterial);
        l.position.set(x,3,z);l.castShadow=true;l.receiveShadow=true;this.scene.add(l);
        const cM=new THREE.Mesh(new THREE.SphereGeometry(1.5,8,8),new THREE.MeshBasicMaterial({visible:false}));
        cM.position.set(x,1.5,z);this.scene.add(cM);cM.userData={isCollidable:true,collisionType:'sphere',collisionRadius:1.5};this.collidableMeshes.push(cM);
    }

    _createDecoratedTree(x,z){
        const tG=new THREE.Group();this.scene.add(tG);
        const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,2,8),this.constants.trunkMaterial);
        tr.position.set(x,1,z);tr.castShadow=true;tr.receiveShadow=true;tG.add(tr);
        const le=new THREE.Mesh(new THREE.ConeGeometry(1,3,8),this.constants.leavesMaterial);
        le.position.set(x,3,z);le.castShadow=true;le.receiveShadow=true;tG.add(le);
        const oG=new THREE.SphereGeometry(0.15,6,6);
        const ornamentMaterials = [this.constants.ornamentMaterialRed, this.constants.ornamentMaterialBlue, this.constants.ornamentMaterialYellow];
        for(let i=0;i<8;i++){const o=new THREE.Mesh(oG,ornamentMaterials[Math.floor(Math.random()*3)]);o.position.set(x+(Math.random()-0.5)*0.8,3+(Math.random()-0.5)*2,z+(Math.random()-0.5)*0.8);o.castShadow=true;tG.add(o);}
        const cM=new THREE.Mesh(new THREE.SphereGeometry(1.5,8,8),new THREE.MeshBasicMaterial({visible:false}));
        cM.position.set(x,1.5,z);this.scene.add(cM);cM.userData={isCollidable:true,collisionType:'sphere',collisionRadius:1.5};this.collidableMeshes.push(cM);
    }

    _createHouse(x,z,rY=0){
        const hG=new THREE.Group();this.scene.add(hG);
        const b=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),this.constants.houseBaseMaterial);
        b.position.set(x,1.5,z);b.castShadow=true;b.receiveShadow=true;hG.add(b);
        const ro=new THREE.Mesh(new THREE.ConeGeometry(3,2,4),this.constants.houseRoofMaterial);
        ro.rotation.y=Math.PI/4;ro.position.set(x,3.5,z);ro.castShadow=true;ro.receiveShadow=true;hG.add(ro);
        const d=new THREE.Mesh(new THREE.BoxGeometry(1,1.8,0.1),this.constants.houseDoorMaterial);
        d.position.set(x,0.9,z+2.01);d.castShadow=true;hG.add(d);
        hG.rotation.y=rY;
        const cM=new THREE.Mesh(new THREE.SphereGeometry(2.5,8,8),new THREE.MeshBasicMaterial({visible:false}));
        cM.position.set(x,1.5,z);this.scene.add(cM);cM.userData={isCollidable:true,collisionType:'sphere',collisionRadius:2.5};this.collidableMeshes.push(cM);
    }

    _createGift(x,z,s, boxMat, ribbonMat){ // Now expects instantiated materials
        const gG=new THREE.Group();this.scene.add(gG);
        const b=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),boxMat);
        b.position.set(x,s/2,z);b.castShadow=true;gG.add(b);
        const rV=new THREE.Mesh(new THREE.BoxGeometry(s+0.05,s+0.05,0.1),ribbonMat);
        rV.position.set(x,s/2,z);rV.rotation.y=Math.PI/2;rV.castShadow=true;gG.add(rV);
        const rH=new THREE.Mesh(new THREE.BoxGeometry(s+0.05,s+0.05,0.1),ribbonMat);
        rH.position.set(x,s/2,z);rH.castShadow=true;gG.add(rH);
    }

    _createSnowman(x,z){
        const sG=new THREE.Group();this.scene.add(sG);
        const b1=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,10),this.constants.snowmanMaterial);
        b1.position.set(x,1.2,z);b1.castShadow=true;sG.add(b1);
        const m=new THREE.Mesh(new THREE.SphereGeometry(0.8,10,10),this.constants.snowmanMaterial);
        m.position.set(x,2.8,z);m.castShadow=true;sG.add(m);
        const hS=new THREE.Mesh(new THREE.SphereGeometry(0.6,10,10),this.constants.snowmanMaterial);
        hS.position.set(x,4.0,z);hS.castShadow=true;sG.add(hS);
        const n=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.5,8),this.constants.noseMaterial);
        n.rotation.x=Math.PI/2;n.position.set(x,4.0,z+0.6);n.castShadow=true;sG.add(n);
        const eyeG=new THREE.SphereGeometry(0.08,6,6);
        const e1=new THREE.Mesh(eyeG,this.constants.eyeMaterial);
        e1.position.set(x-0.25,4.1,z+0.55);e1.castShadow=true;sG.add(e1);
        const e2=new THREE.Mesh(eyeG,this.constants.eyeMaterial);
        e2.position.set(x+0.25,4.1,z+0.55);e2.castShadow=true;sG.add(e2);
        const cM=new THREE.Mesh(new THREE.SphereGeometry(1.5,8,8),new THREE.MeshBasicMaterial({visible:false}));
        cM.position.set(x,2,z);this.scene.add(cM);cM.userData={isCollidable:true,collisionType:'sphere',collisionRadius:1.5};this.collidableMeshes.push(cM);
    }

    _createMountain(x,z,s){
        const mR=10*s;const mH=15*s;
        const mG=new THREE.ConeGeometry(mR,mH,8);
        const mM=new THREE.Mesh(mG,this.constants.snowMaterial);
        mM.position.set(x,mH/2,z);mM.castShadow=true;mM.receiveShadow=true;this.scene.add(mM);
        mM.userData={isCollidable:true,collisionType:'cone',radius:mR,height:mH,baseY:mM.position.y-mH/2};this.collidableMeshes.push(mM);
    }

    _createTerrainPatch(x,z,type,sx,sz,h){
        let pM;
        if(type==='rock')pM=this.constants.rockPatchMaterial;
        else pM=this.constants.dirtPatchMaterial;
        const p=new THREE.Mesh(new THREE.BoxGeometry(sx,h,sz),pM);
        p.position.set(x,h/2,z);p.castShadow=true;p.receiveShadow=true;this.scene.add(p);
    }

    _createGiantHand(s){
        const hG=new THREE.Group();
        const p=new THREE.Mesh(new THREE.BoxGeometry(3*s,s,4*s),this.constants.handStoneMaterial);
        p.position.y=0.5*s;p.castShadow=true;p.receiveShadow=true;hG.add(p);
        const fG=new THREE.BoxGeometry(0.8*s,0.8*s,1.5*s);
        const th=new THREE.Mesh(fG,this.constants.handStoneMaterial);th.position.set(-1.5*s,0.8*s,-1.5*s);th.rotation.z=Math.PI/4;th.castShadow=true;th.receiveShadow=true;hG.add(th);
        const ind=new THREE.Mesh(fG,this.constants.handStoneMaterial);ind.position.set(0*s,1.2*s,2*s);ind.castShadow=true;ind.receiveShadow=true;hG.add(ind);
        const mid=new THREE.Mesh(fG,this.constants.handStoneMaterial);mid.position.set(1*s,1.2*s,2*s);mid.castShadow=true;mid.receiveShadow=true;hG.add(mid);
        const rin=new THREE.Mesh(fG,this.constants.handStoneMaterial);rin.position.set(-1*s,1.2*s,2*s);rin.castShadow=true;rin.receiveShadow=true;hG.add(rin);
        return hG;
    }

    _createSanctuary(x,z,clrHex){
        const sG=new THREE.Group();sG.position.set(x,0,z);this.scene.add(sG);
        const cMat=new THREE.MeshStandardMaterial({color:clrHex,transparent:true,opacity:0.6,emissive:clrHex,emissiveIntensity:20}); // Dynamic material
        const cH=new THREE.Mesh(new THREE.OctahedronGeometry(1.5,0),cMat);
        cH.position.y=4;cH.castShadow=true;sG.add(cH);
        if(clrHex===0x00ccff)this.blueCrystalHeart=cH;else this.redCrystalHeart=cH;
        const cL=new THREE.PointLight(clrHex,400,30);cL.position.copy(cH.position);cL.castShadow=false;sG.add(cL);
        const lH=this._createGiantHand(2);lH.position.set(-3,0,-1);lH.rotation.y=-Math.PI/8;lH.rotation.x=Math.PI/16;sG.add(lH);
        const rH=this._createGiantHand(2);rH.position.set(3,0,-1);rH.rotation.y=Math.PI/8;rH.rotation.x=Math.PI/16;sG.add(rH);
        const bRM=new THREE.MeshStandardMaterial({color:0x404040,roughness:0.9}); // Local material for base rocks
        for(let i=0;i<15;i++){const r=new THREE.Mesh(new THREE.BoxGeometry(1+Math.random()*2,0.5+Math.random()*1,1+Math.random()*2),bRM);r.position.set((Math.random()-0.5)*8,0,(Math.random()-0.5)*8);r.rotation.y=Math.random()*Math.PI;r.castShadow=true;r.receiveShadow=true;sG.add(r);}
        const oC=4;const oR=6;const oH=4;
        const oMat=new THREE.MeshStandardMaterial({color:clrHex,emissive:clrHex,emissiveIntensity:10}); // Dynamic material for orbs
        const oGeo=new THREE.SphereGeometry(0.5,8,8);let cOrbs=[];
        for(let i=0;i<oC;i++){const o=new THREE.Mesh(oGeo,oMat);o.position.set(Math.cos(i*Math.PI*2/oC)*oR,oH,Math.sin(i*Math.PI*2/oC)*oR);o.castShadow=false;sG.add(o);const oL=new THREE.PointLight(clrHex,80,10);oL.position.copy(o.position);oL.castShadow=false;sG.add(oL);cOrbs.push({orb:o,light:oL,initialAngle:i*Math.PI*2/oC});}
        if(clrHex===0x00ccff)this.blueFloatingOrbs=cOrbs;else this.redFloatingOrbs=cOrbs;
        const colM=new THREE.Mesh(new THREE.SphereGeometry(2,8,8),new THREE.MeshBasicMaterial({visible:false}));
        colM.position.copy(sG.position).add(cH.position);this.scene.add(colM);colM.userData={isCollidable:true,collisionType:'sphere',collisionRadius:2};this.collidableMeshes.push(colM);
    }

    _populate(){
        this._createTree(10,5);this._createTree(-8,-12);this._createTree(15,-7);this._createTree(-5,10);this._createTree(20,15);this._createTree(-15,-5);this._createTree(35,25);this._createTree(-35,-25);
        this._createDecoratedTree(-12,8);this._createDecoratedTree(8,-18);this._createDecoratedTree(-20,-10);this._createDecoratedTree(28,-20);this._createDecoratedTree(-18,30);
        this._createHouse(25,0,Math.PI/4);this._createHouse(-20,20,-Math.PI/8);this._createHouse(0,-25,Math.PI/2);this._createHouse(-30,-5,Math.PI/6);this._createHouse(10,30,Math.PI/3);this._createHouse(-15,-35,-Math.PI/5);
        // Simplified _createGift calls, using predefined materials from CONSTANTS
        this._createGift(18,-6,0.8, CONSTANTS.giftBoxMaterialGreen, CONSTANTS.giftRibbonMaterialWhite);
        this._createGift(17,-5,1.0, CONSTANTS.giftBoxMaterialPink, CONSTANTS.giftRibbonMaterialYellow);
        this._createGift(-10,12,0.7, CONSTANTS.giftBoxMaterialCyan, CONSTANTS.giftRibbonMaterialBlue);
        this._createGift(26,-18,0.9, CONSTANTS.giftBoxMaterialOrange, CONSTANTS.giftRibbonMaterialWhite);
        this._createSnowman(12,-10);this._createSnowman(-2,18);this._createSnowman(30,8);this._createSnowman(-25,-20);
        this._createMountain(50,-50,2);this._createMountain(-60,-40,1.5);this._createMountain(-40,60,2.5);this._createMountain(70,70,1.8);this._createMountain(-70,0,2.2);this._createMountain(0,-70,1.7);
        this._createTerrainPatch(5,-15,'rock',8,8,0.2);this._createTerrainPatch(-10,25,'dirt',6,6,0.15);this._createTerrainPatch(20,30,'rock',10,7,0.3);this._createTerrainPatch(-30,-10,'dirt',7,9,0.1);this._createTerrainPatch(0,0,'rock',4,4,0.1);
        this._createSanctuary(10,0,0x00ccff);this._createSanctuary(-10,0,0xff0000);
    }

    updateWorldAnimations(delta,clockRef){
        const eT=clockRef.getElapsedTime();
        const cPS=this.constants.crystalPulseSpeed || 2; // Use from constants or default
        const oOS=this.constants.orbOrbitSpeed || 0.5;   // Use from constants or default

        if(this.blueCrystalHeart){this.blueCrystalHeart.position.y=4+Math.sin(eT*cPS)*0.2;this.blueCrystalHeart.rotation.y+=delta*0.5;}
        this.blueFloatingOrbs.forEach(oD=>{const o=oD.orb;const angle=oD.initialAngle+eT*oOS;o.position.x=Math.cos(angle)*6;o.position.y=4+Math.sin(eT*2)*0.5;o.position.z=Math.sin(angle)*6;if(oD.light)oD.light.position.copy(o.position);});
        if(this.redCrystalHeart){this.redCrystalHeart.position.y=4+Math.cos(eT*cPS)*0.2;this.redCrystalHeart.rotation.y-=delta*0.5;}
        this.redFloatingOrbs.forEach(oD=>{const o=oD.orb;const angle=oD.initialAngle-eT*oOS;o.position.x=Math.cos(angle)*6;o.position.y=4+Math.cos(eT*2)*0.5;o.position.z=Math.sin(angle)*6;if(oD.light)oD.light.position.copy(o.position);});
    }
}
export { World };
