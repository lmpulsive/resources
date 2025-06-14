import * as THREE from 'three';

// Each particle system class receives the `constants` module via its constructor,
// allowing access to values like snowDrawDistance, kickUpCount, etc.

class WindParticleSystem {
    constructor(scene, constants) {
        this.scene = scene;
        this.constants = constants; // Store constants if needed
        this.windParticles = null;
        this._init();
    }

    _init() {
        const particleCount = 4000;
        const particles = new THREE.BufferGeometry();
        const positions = []; const colorsArr = []; const pColor = new THREE.Color(0xffffff);
        for (let i = 0; i < particleCount; i++) {
            positions.push(Math.random()*300-150, Math.random()*60+20, Math.random()*300-150);
            colorsArr.push(pColor.r, pColor.g, pColor.b);
        }
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.Float32BufferAttribute(colorsArr, 3));
        const mat = new THREE.PointsMaterial({size:0.3,vertexColors:true,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending});
        this.windParticles = new THREE.Points(particles, mat);
        this.scene.add(this.windParticles);
    }

    update(delta, characterPosition) {
        if (!this.windParticles) return;
        const positions = this.windParticles.geometry.attributes.position.array;
        const resetHeight = characterPosition.y + 40;
        const fallSpeed = 3;
        const drawDist = this.constants ? this.constants.snowDrawDistance : 40;
        const drift = this.constants ? this.constants.windDriftSpeed : 0.5;

        for (let i=0; i<positions.length; i+=3) {
            positions[i+1] -= (0.5+Math.random()*0.5)*delta*fallSpeed;
            positions[i] += (Math.random()-0.5)*drift*delta;
            positions[i+2] += (Math.random()-0.5)*drift*delta;
            const dx=positions[i]-characterPosition.x; const dz=positions[i+2]-characterPosition.z;
            if (positions[i+1]<characterPosition.y-2 || Math.sqrt(dx*dx+dz*dz)>drawDist) {
                positions[i]=characterPosition.x+(Math.random()*2*drawDist-drawDist)*2;
                positions[i+1]=resetHeight+(Math.random()*10);
                positions[i+2]=characterPosition.z+(Math.random()*2*drawDist-drawDist)*2;
            }
        }
        this.windParticles.geometry.attributes.position.needsUpdate = true;
    }
}

class KickUpParticleSystem {
    constructor(scene, constants) {
        this.scene = scene;
        this.constants = constants;
        this.kickUpParticles = null;
        this.particlePool = [];
        this.positionsAttribute = null;
        this.sizesAttribute = null;
        this.count = this.constants ? this.constants.kickUpCount : 100;
        this._init();
    }

    _init() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const sizes = new Float32Array(this.count);
        for(let i=0;i<this.count;i++){ positions[i*3]=0; positions[i*3+1]=-1000; positions[i*3+2]=0; sizes[i]=0; this.particlePool.push({x:0,y:-1000,z:0,vx:0,vy:0,vz:0,lifespan:0,maxLifespan:(this.constants.kickUpMaxLifespan || 0.5) * (0.6 + Math.random()*0.8) ,baseSize:0.15+Math.random()*0.1});} // Adjusted maxLifespan variability
        this.positionsAttribute = new THREE.BufferAttribute(positions,3);
        this.sizesAttribute = new THREE.BufferAttribute(sizes,1);
        geometry.setAttribute('position',this.positionsAttribute);
        geometry.setAttribute('size',this.sizesAttribute);
        const mat = new THREE.PointsMaterial({color:0xffffff,size:0.2,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,sizeAttenuation:true});
        this.kickUpParticles = new THREE.Points(geometry,mat);
        this.scene.add(this.kickUpParticles);
    }

    update(delta, characterPosition, isCharacterMoving) {
        if(!this.kickUpParticles) return;
        const emitRate = this.constants ? this.constants.kickUpEmitRate : 10;
        // Simplified emit logic: attempt to emit one particle if moving and pool allows
        if(isCharacterMoving){
            const particlesToEmit = Math.floor(emitRate * delta) || 1; // Emit at least one if moving and delta is small
            let emittedThisFrame = 0;
            for(let i=0;i<this.count && emittedThisFrame < particlesToEmit ;i++){ const p=this.particlePool[i]; if(p.lifespan<=0){p.x=characterPosition.x+(Math.random()-0.5)*1.5;p.y=characterPosition.y+0.5;p.z=characterPosition.z+(Math.random()-0.5)*1.5;p.vx=(Math.random()-0.5)*2;p.vy=Math.random()*3+1;p.vz=(Math.random()-0.5)*2;p.lifespan=p.maxLifespan; emittedThisFrame++;}}
        }
        for(let i=0;i<this.count;i++){ const p=this.particlePool[i]; if(p.lifespan>0){p.lifespan-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;p.z+=p.vz*delta;p.vy-=9.8*delta;this.positionsAttribute.array[i*3]=p.x;this.positionsAttribute.array[i*3+1]=p.y;this.positionsAttribute.array[i*3+2]=p.z;this.sizesAttribute.array[i]=(p.lifespan/p.maxLifespan)*p.baseSize;}else{this.positionsAttribute.array[i*3+1]=-1000;this.sizesAttribute.array[i]=0;}}
        this.positionsAttribute.needsUpdate=true; this.sizesAttribute.needsUpdate=true;
    }
}

class GunGlowEffect {
    constructor(constants) {
        this.constants = constants;
        this.gunGlowParticles = null;
        this.particlePool = [];
        this.positionsAttribute = null;
        this.sizesAttribute = null;
        this.count = this.constants ? this.constants.gunGlowParticleCount : 150;
        this._init();
    }
    _init() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count*3); const sizes = new Float32Array(this.count);
        for(let i=0;i<this.count;i++){ positions[i*3]=0;positions[i*3+1]=0;positions[i*3+2]=0;sizes[i]=0;this.particlePool.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,lifespan:0,maxLifespan:1.0+Math.random()*1.0,baseSize:0.15+Math.random()*0.1});}
        this.positionsAttribute = new THREE.BufferAttribute(positions,3); this.sizesAttribute = new THREE.BufferAttribute(sizes,1);
        geometry.setAttribute('position',this.positionsAttribute); geometry.setAttribute('size',this.sizesAttribute);
        const mat = new THREE.PointsMaterial({color:0x8affff,size:0.2,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,sizeAttenuation:true});
        this.gunGlowParticles = new THREE.Points(geometry,mat);
    }
    getParticlesObject() { return this.gunGlowParticles; }
    update(delta) {
        if(!this.gunGlowParticles) return;
        for(let i=0;i<this.count;i++){ const p=this.particlePool[i]; if(p.lifespan<=0){const sr=0.5;p.x=(Math.random()-0.5)*sr;p.y=(Math.random()-0.5)*sr;p.z=(Math.random()-0.5)*sr;p.vx=(Math.random()-0.5)*0.2;p.vy=(Math.random()*0.5+0.1);p.vz=(Math.random()-0.5)*0.2;p.lifespan=p.maxLifespan;}else{p.lifespan-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;p.z+=p.vz*delta;p.vx+=(Math.random()-0.5)*0.05*delta;p.vz+=(Math.random()-0.5)*0.05*delta;this.positionsAttribute.array[i*3]=p.x;this.positionsAttribute.array[i*3+1]=p.y;this.positionsAttribute.array[i*3+2]=p.z;this.sizesAttribute.array[i]=(p.lifespan/p.maxLifespan)*p.baseSize;}}
        this.positionsAttribute.needsUpdate=true;this.sizesAttribute.needsUpdate=true;
    }
}

class ShrineParticleEffect {
    constructor(scene, color, constants) {
        this.scene = scene; this.color = color; this.constants = constants;
        this.particles = null; this.particlePool = [];
        this.positionsAttribute = null; this.sizesAttribute = null;
        this.count = this.constants ? this.constants.shrineParticleCount : 500;
        this._init();
    }
    _init() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count*3); const sizes = new Float32Array(this.count);
        for(let i=0;i<this.count;i++){ positions[i*3]=0;positions[i*3+1]=0;positions[i*3+2]=0;sizes[i]=0;this.particlePool.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,lifespan:0,maxLifespan:0.8+Math.random()*0.7,baseSize:0.4+Math.random()*0.4});}
        this.positionsAttribute = new THREE.BufferAttribute(positions,3); this.sizesAttribute = new THREE.BufferAttribute(sizes,1);
        geometry.setAttribute('position',this.positionsAttribute); geometry.setAttribute('size',this.sizesAttribute);
        const mat = new THREE.PointsMaterial({color:this.color,size:0.5,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,sizeAttenuation:true});
        this.particles = new THREE.Points(geometry,mat);
        this.scene.add(this.particles);
    }
    update(delta, shrineCenterPosition) {
        if(!this.particles) return;
        if (shrineCenterPosition) { // shrineCenterPosition is expected to be a THREE.Vector3 in world space
            this.particles.position.copy(shrineCenterPosition);
        } else {
             this.particles.visible = false; // Hide if center is not defined
             return;
        }
        this.particles.visible = true;

        for(let i=0;i<this.count;i++){ const p=this.particlePool[i]; if(p.lifespan<=0){p.x=(Math.random()-0.5)*0.5;p.y=(Math.random()-0.5)*0.5;p.z=(Math.random()-0.5)*0.5;const angle=Math.random()*Math.PI*2;const speed=2+Math.random()*3;p.vx=Math.cos(angle)*speed*(Math.random()>0.5?1:-1);p.vy=2.0+Math.random()*4.0;p.vz=Math.sin(angle)*speed*(Math.random()>0.5?1:-1);p.lifespan=p.maxLifespan;}else{p.lifespan-=delta;p.x+=p.vx*delta;p.y+=p.vy*delta;p.z+=p.vz*delta;p.vy-=1.5*delta;this.positionsAttribute.array[i*3]=p.x;this.positionsAttribute.array[i*3+1]=p.y;this.positionsAttribute.array[i*3+2]=p.z;this.sizesAttribute.array[i]=(p.lifespan/p.maxLifespan)*p.baseSize;}}
        this.positionsAttribute.needsUpdate=true; this.sizesAttribute.needsUpdate=true;
    }
}

export let windSystem, kickUpSystem, gunGlowEffect, redShrineSystem, blueShrineSystem;

export function initAllParticleSystems(scene, constants) {
    // windSystem = new WindParticleSystem(scene, constants); // Comment out or remove
    // kickUpSystem = new KickUpParticleSystem(scene, constants); // Comment out or remove
    // gunGlowEffect = new GunGlowEffect(constants); // Comment out or remove
    // redShrineSystem = new ShrineParticleEffect(scene, 0xff4500, constants); // Comment out or remove
    // blueShrineSystem = new ShrineParticleEffect(scene, 0x87ceeb, constants); // Comment out or remove
    // return { gunGlowParticlesObject: gunGlowEffect.getParticlesObject() }; // Remove this part
    return {}; // Or return other systems if any are still managed here (none are now)
}
