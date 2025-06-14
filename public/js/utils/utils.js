export function lerpAngles(a, b, alpha) {
    let angle = b - a;
    // Normalize angle to be within [-PI, PI]
    if (angle > Math.PI) angle -= 2 * Math.PI;
    if (angle < -Math.PI) angle += 2 * Math.PI;
    return a + angle * alpha;
}
