import * as pc from 'playcanvas';

/**
 * Helper for orbit camera limits and keyboard pan.
 * - Clamp camera target to an AABB (pan bounds).
 * - Apply arrow-key pan to target using camera right/up vectors.
 */

/**
 * Clamp target position to a bounding box. Modifies target in place.
 * @param {pc.Vec3} target - Target vector to clamp (modified in place).
 * @param {number} minX
 * @param {number} minY
 * @param {number} minZ
 * @param {number} maxX
 * @param {number} maxY
 * @param {number} maxZ
 * @returns {pc.Vec3} target
 */
export function clampTargetToBounds(target, minX, minY, minZ, maxX, maxY, maxZ) {
    target.x = pc.math.clamp(target.x, minX, maxX);
    target.y = pc.math.clamp(target.y, minY, maxY);
    target.z = pc.math.clamp(target.z, minZ, maxZ);
    return target;
}

/**
 * Apply arrow-key pan to target. Modifies target in place.
 * Uses camera entity's right and up vectors; speed is world units per second.
 * @param {pc.Application} app - PlayCanvas app (for app.keyboard).
 * @param {pc.Entity} entity - Camera entity (for world right/up).
 * @param {pc.Vec3} target - Target to move (modified in place).
 * @param {number} dt - Delta time in seconds.
 * @param {number} keyPanSpeed - World units per second.
 * @returns {pc.Vec3} target
 */
export function applyArrowKeyPan(app, entity, target, dt, keyPanSpeed) {
    if (!app?.keyboard || keyPanSpeed <= 0) return target;
    const keyboard = app.keyboard;
    const right = new pc.Vec3();
    const up = new pc.Vec3();
    entity.getWorldTransform().getX(right);
    entity.getWorldTransform().getY(up);
    const move = keyPanSpeed * dt;
    if (keyboard.isPressed(pc.KEY_LEFT)) target.add(right.mulScalar(-move));
    if (keyboard.isPressed(pc.KEY_RIGHT)) target.add(right.mulScalar(move));
    if (keyboard.isPressed(pc.KEY_UP)) target.add(up.mulScalar(move));
    if (keyboard.isPressed(pc.KEY_DOWN)) target.add(up.mulScalar(-move));
    return target;
}
