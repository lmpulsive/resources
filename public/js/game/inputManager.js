// Object to store key states for movement (WASD and Space for jump)
export const keys = {
    'w': false,
    'a': false,
    's': false,
    'd': false,
    ' ': false, // Spacebar for jump
    'f': false  // Added 'f' for firing
};

// Store previous key states for "just pressed" logic
export let prevKeys = { ...keys };

// Camera control variables
export let isDragging = false;
export let previousMouseX = 0;
export let cameraRotationAngle = 0; // Current angle of the camera around the character

export function initKeyListeners() {
    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (key in keys) {
            keys[key] = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        if (key in keys) {
            keys[key] = false;
        }
    });
}

function handleMouseDown(event) {
    isDragging = true;
    previousMouseX = event.clientX;
}

function handleMouseMove(event) {
    if (!isDragging) return;
    const deltaX = event.clientX - previousMouseX;
    cameraRotationAngle += deltaX * 0.005;
    previousMouseX = event.clientX;
}

function handleMouseUp() {
    isDragging = false;
}

function handleMouseLeave() {
    isDragging = false;
}

export function initMouseListeners(rendererDomElement) {
    rendererDomElement.addEventListener('mousedown', handleMouseDown);
    rendererDomElement.addEventListener('mousemove', handleMouseMove);
    rendererDomElement.addEventListener('mouseup', handleMouseUp);
    rendererDomElement.addEventListener('mouseleave', handleMouseLeave);
}

export function getCameraRotationAngle() { return cameraRotationAngle; }
export function setCameraRotationAngle(angle) { cameraRotationAngle = angle; }

// New methods for "just pressed" logic
export function updatePrevKeys() {
    prevKeys = { ...keys };
}

export function isKeyJustPressed(key) {
    return keys[key] && !prevKeys[key];
}

// Helper to get current keys state (if needed by other modules directly, though main.js uses it)
export function getKeys() {
    return keys;
}
