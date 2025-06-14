import * as THREE from 'three';

// constantsModule is passed to the constructor and stored as this.constants
// for accessing values like cameraDistance, cameraOffsetY, spotlightHeight.

class Renderer {
    constructor(container, constantsModule) {
        this.container = container;
        this.constants = constantsModule; // Store if needed for camera settings etc.

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a20);

        // Camera setup
        const aspect = window.innerWidth / window.innerHeight;
        // Use constants for camera settings if available, else fallback to defaults
        const camFoV = 75;
        const camNear = 0.1;
        const camFar = 1000;
        this.camera = new THREE.PerspectiveCamera(camFoV, aspect, camNear, camFar);

        const camDist = (this.constants && this.constants.cameraDistance) ? this.constants.cameraDistance : 6;
        const camOffsetY = (this.constants && this.constants.cameraOffsetY) ? this.constants.cameraOffsetY : 5;
        this.camera.position.set(0, camOffsetY, camDist);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ReinhardToneMapping; // Example, can be other types
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);
        this.rendererDOM = this.renderer.domElement; // Expose DOM element

        this._initLighting();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    _initLighting() {
        const ambientLight = new THREE.AmbientLight(0x606080, 0.1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xb0e0e6, 0.8);
        directionalLight.position.set(5, 15, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        const spotHeight = (this.constants && this.constants.spotlightHeight) ? this.constants.spotlightHeight : 8;
        this.playerSpotlight = new THREE.SpotLight(0xffffe0, 15, spotHeight + 5, Math.PI / 3, 0.7, 2); // Distance adjusted based on height
        this.playerSpotlight.castShadow = false;
        this.scene.add(this.playerSpotlight);
        this.scene.add(this.playerSpotlight.target);
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    updateCameraAndSpotlight(characterGroupRef, cameraRotationAngle) {
        if (!characterGroupRef || !this.camera || !this.playerSpotlight) return;

        const camDist = (this.constants && this.constants.cameraDistance) ? this.constants.cameraDistance : 6;
        const camOffsetY = (this.constants && this.constants.cameraOffsetY) ? this.constants.cameraOffsetY : 5;
        const spotHeight = (this.constants && this.constants.spotlightHeight) ? this.constants.spotlightHeight : 8;

        const targetX = characterGroupRef.position.x + Math.sin(cameraRotationAngle) * camDist;
        const targetZ = characterGroupRef.position.z + Math.cos(cameraRotationAngle) * camDist;

        this.camera.position.x = targetX;
        this.camera.position.y = characterGroupRef.position.y + camOffsetY;
        this.camera.position.z = targetZ;
        this.camera.lookAt(characterGroupRef.position.x, characterGroupRef.position.y + 1, characterGroupRef.position.z);

        this.playerSpotlight.position.set(
            characterGroupRef.position.x,
            characterGroupRef.position.y + spotHeight,
            characterGroupRef.position.z
        );
        this.playerSpotlight.target.position.copy(characterGroupRef.position);
        this.playerSpotlight.target.updateMatrixWorld();
    }

    renderScene() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

export { Renderer }; // Export the class itself
