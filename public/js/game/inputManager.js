// public/js/game/inputManager.js

class InputManager {
    constructor() {
        this.keys = {
            'w': false, 'a': false, 's': false, 'd': false,
            ' ': false, // Spacebar for jump
            'f': false  // For firing
        };
        this.prevKeys = { ...this.keys };

        this.isDragging = false;
        this.previousMouseX = 0;
        this.cameraRotationAngle = 0;
    }

    // Initialize keyboard event listeners
    initKeyListeners() {
        window.addEventListener('keydown', (event) => {
            const key = event.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
            }
        });
    }

    // Initialize mouse event listeners
    initMouseListeners(rendererDomElement) {
        rendererDomElement.addEventListener('mousedown', (event) => {
            this.isDragging = true;
            this.previousMouseX = event.clientX;
        });

        rendererDomElement.addEventListener('mousemove', (event) => {
            if (!this.isDragging) return;
            const deltaX = event.clientX - this.previousMouseX;
            this.cameraRotationAngle += deltaX * 0.005;
            this.previousMouseX = event.clientX;
        });

        rendererDomElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        rendererDomElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
    }

    // Getters for state
    getKeys() {
        return this.keys;
    }

    isDraggingState() {
        return this.isDragging;
    }

    getCameraRotationAngle() {
        return this.cameraRotationAngle;
    }

    // Setter for state
    setCameraRotationAngle(angle) {
        this.cameraRotationAngle = angle;
    }

    // Update previous key states (call once per frame)
    updatePrevKeys() {
        this.prevKeys = { ...this.keys };
    }

    // Check if a key was just pressed
    isKeyJustPressed(key) {
        return this.keys[key] && !this.prevKeys[key];
    }
}

const inputManagerInstance = new InputManager();
export default inputManagerInstance;
