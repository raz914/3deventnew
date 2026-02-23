import * as pc from 'playcanvas';

/**
 * Placeholder placement system: registry, placement plane, ray/plane hit,
 * place/drag/rotate/delete, and canvas input (capture-phase).
 *
 * @param {Object} options
 * @param {pc.Application} options.app
 * @param {HTMLCanvasElement} options.canvas
 * @param {pc.Entity} options.camera - Camera entity (with camera + script.orbitCamera for bounds)
 * @param {{ minX, minY, minZ, maxX, maxY, maxZ }} [options.defaultBounds] - Fallback when orbit script not ready
 * @returns {{ destroy: () => void, ...api }}
 */
export function initPlaceholderSystem(options) {
    const { app, canvas, camera, defaultBounds = {} } = options;
    const PAN_FALLBACK = {
        minX: defaultBounds.minX ?? -2,
        minY: defaultBounds.minY ?? 0,
        minZ: defaultBounds.minZ ?? -4,
        maxX: defaultBounds.maxX ?? 3,
        maxY: defaultBounds.maxY ?? 2.5,
        maxZ: defaultBounds.maxZ ?? 1
    };

    const placeholderRegistry = new Map(); // id -> { id, typeId, name, entity, yaw }
    let placeholderIdCounter = 0;
    let placementMode = null;
    let selectedPlaceholderId = null;
    let placementPlaneVisible = false;
    let placementPlaneEntity = null;
    let draggingPlaceholderId = null;
    let placementPlaneY = 1.1;
    let placementPlaneRotationY = 27;
    let placementPlaneWidth = 6.1;
    let placementPlaneLength = 3.1;

    function getBounds() {
        const orbit = camera.script?.orbitCamera;
        if (orbit) {
            return {
                minX: orbit.panBoundsMinX,
                minY: orbit.panBoundsMinY,
                minZ: orbit.panBoundsMinZ,
                maxX: orbit.panBoundsMaxX,
                maxY: orbit.panBoundsMaxY,
                maxZ: orbit.panBoundsMaxZ
            };
        }
        return PAN_FALLBACK;
    }

    function getPlacementPlaneY() { return placementPlaneY; }

    function createPlacementPlane() {
        const b = getBounds();
        const y = getPlacementPlaneY();
        const planeEntity = new pc.Entity('placementPlane');
        const geometry = new pc.PlaneGeometry({ width: 1, length: 1 });
        const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);
        const material = new pc.StandardMaterial();
        material.useLighting = false;
        material.emissive = new pc.Color(0.1, 0.55, 0.85);
        material.opacity = 0.55;
        material.blendType = pc.BLEND_NORMAL;
        material.cull = pc.CULLFACE_NONE;
        material.update();
        const meshInstance = new pc.MeshInstance(mesh, material);
        planeEntity.addComponent('render', { meshInstances: [meshInstance] });
        planeEntity.setPosition((b.minX + b.maxX) * 0.5, y, (b.minZ + b.maxZ) * 0.5);
        planeEntity.setLocalScale(placementPlaneWidth, 1, placementPlaneLength);
        planeEntity.setEulerAngles(0, placementPlaneRotationY, 0);
        app.root.addChild(planeEntity);
        return planeEntity;
    }

    placementPlaneEntity = createPlacementPlane();
    placementPlaneEntity.enabled = placementPlaneVisible;

    function screenToRay(clientX, clientY) {
        const cam = camera.camera;
        if (!cam) return { origin: null, direction: null };
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const origin = new pc.Vec3();
        const end = new pc.Vec3();
        cam.screenToWorld(x, y, cam.nearClip, origin);
        cam.screenToWorld(x, y, cam.farClip, end);
        const direction = new pc.Vec3().sub2(end, origin).normalize();
        return { origin, direction };
    }

    function rayPlaneIntersectionY(rayOrigin, rayDir, planeY) {
        const eps = 1e-6;
        if (Math.abs(rayDir.y) < eps) return null;
        const t = (planeY - rayOrigin.y) / rayDir.y;
        if (t < 0) return null;
        const p = new pc.Vec3();
        p.x = rayOrigin.x + rayDir.x * t;
        p.y = planeY;
        p.z = rayOrigin.z + rayDir.z * t;
        return p;
    }

    function getTypeSpec(typeId) {
        if (typeId === 'chair') {
            return {
                halfExtents: new pc.Vec3(0.25, 0.35, 0.25),
                color: new pc.Color(0.95, 0.58, 0.2),
                yOffset: 0.35
            };
        }
        if (typeId === 'table') {
            return {
                halfExtents: new pc.Vec3(0.5, 0.2, 0.4),
                color: new pc.Color(0.62, 0.45, 0.9),
                yOffset: 0.2
            };
        }
        return {
            halfExtents: new pc.Vec3(0.3, 0.3, 0.3),
            color: new pc.Color(0.85, 0.85, 0.85),
            yOffset: 0.3
        };
    }

    function createPlaceholderMesh(typeId) {
        const device = app.graphicsDevice;
        const spec = getTypeSpec(typeId);
        const box = new pc.BoxGeometry({ halfExtents: spec.halfExtents });
        const mesh = pc.Mesh.fromGeometry(device, box);
        const mat = new pc.StandardMaterial();
        mat.useLighting = false;
        mat.emissive = spec.color;
        mat.diffuse = spec.color;
        mat.update();
        return new pc.MeshInstance(mesh, mat);
    }

    function createPlaceholderEntity(typeId, name, x, y, z, yawDeg) {
        const id = `ph_${++placeholderIdCounter}`;
        const entity = new pc.Entity(`placeholder_${id}`);
        const meshInstance = createPlaceholderMesh(typeId);
        entity.addComponent('render', { meshInstances: [meshInstance] });
        const spec = getTypeSpec(typeId);
        entity.setPosition(x, y + spec.yOffset, z);
        entity.setEulerAngles(0, yawDeg, 0);
        entity.setLocalScale(1, 1, 1);
        app.root.addChild(entity);
        const record = { id, typeId, name, entity, yaw: yawDeg, yOffset: spec.yOffset };
        placeholderRegistry.set(id, record);
        return record;
    }

    function removePlaceholder(id) {
        const record = placeholderRegistry.get(id);
        if (!record) return;
        record.entity.destroy();
        placeholderRegistry.delete(id);
        if (selectedPlaceholderId === id) selectedPlaceholderId = null;
        if (draggingPlaceholderId === id) draggingPlaceholderId = null;
    }

    function getPlaceholderAtScreen(screenX, screenY) {
        const planeY = getPlacementPlaneY();
        const { origin, direction } = screenToRay(screenX, screenY);
        const hit = rayPlaneIntersectionY(origin, direction, planeY);
        if (!hit) return null;
        const radius = 0.6;
        let best = null;
        let bestDist = radius * radius;
        for (const [, rec] of placeholderRegistry) {
            const pos = rec.entity.getPosition();
            const dx = hit.x - pos.x;
            const dz = hit.z - pos.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < bestDist) {
                bestDist = d2;
                best = rec;
            }
        }
        return best;
    }

    function screenToPlanePosition(screenX, screenY) {
        const planeY = getPlacementPlaneY();
        const { origin, direction } = screenToRay(screenX, screenY);
        return rayPlaneIntersectionY(origin, direction, planeY);
    }

    /** Clamp world (x, z) to the placement plane rectangle (rotated by placementPlaneRotationY). Returns { x, z }. */
    function clampToPlaneBounds(worldX, worldZ) {
        if (!placementPlaneEntity) return { x: worldX, z: worldZ };
        const center = placementPlaneEntity.getPosition();
        const cx = center.x;
        const cz = center.z;
        const rad = placementPlaneRotationY * pc.math.DEG_TO_RAD;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        const dx = worldX - cx;
        const dz = worldZ - cz;
        const halfW = placementPlaneWidth * 0.5;
        const halfL = placementPlaneLength * 0.5;
        const localX = dx * cosR + dz * sinR;
        const localZ = -dx * sinR + dz * cosR;
        const clampedLocalX = pc.math.clamp(localX, -halfW, halfW);
        const clampedLocalZ = pc.math.clamp(localZ, -halfL, halfL);
        const outX = cx + clampedLocalX * cosR - clampedLocalZ * sinR;
        const outZ = cz + clampedLocalX * sinR + clampedLocalZ * cosR;
        return { x: outX, z: outZ };
    }

    function enterPlacementMode(typeId, displayName) {
        placementMode = { typeId, displayName };
    }

    function cancelPlacementMode() {
        placementMode = null;
    }

    function getPlacementMode() {
        return placementMode;
    }

    function placePlaceholderAtScreen(screenX, screenY) {
        const pos = screenToPlanePosition(screenX, screenY);
        if (!pos || !placementMode) return null;
        const planeY = getPlacementPlaneY();
        const clamped = clampToPlaneBounds(pos.x, pos.z);
        const rec = createPlaceholderEntity(placementMode.typeId, placementMode.displayName, clamped.x, planeY, clamped.z, 0);
        selectedPlaceholderId = rec.id;
        placementMode = null; // one-click spawn mode; then switch to edit/move
        return rec;
    }

    function getPlaceholders() {
        return Array.from(placeholderRegistry.values()).map((r) => ({
            id: r.id,
            typeId: r.typeId,
            name: r.name,
            yaw: r.yaw,
            position: (() => {
                const p = r.entity.getPosition();
                return { x: p.x, y: p.y, z: p.z };
            })()
        }));
    }

    function getSelectedPlaceholder() {
        if (!selectedPlaceholderId) return null;
        const rec = placeholderRegistry.get(selectedPlaceholderId);
        if (!rec) return { id: selectedPlaceholderId, name: '?', typeId: '?' };
        return { id: rec.id, name: rec.name, typeId: rec.typeId };
    }

    function getSelectedPlaceholderYaw() {
        const rec = selectedPlaceholderId ? placeholderRegistry.get(selectedPlaceholderId) : null;
        return rec ? rec.yaw : 0;
    }

    function setSelectedPlaceholderYaw(degrees) {
        const rec = selectedPlaceholderId ? placeholderRegistry.get(selectedPlaceholderId) : null;
        if (!rec) return;
        rec.yaw = degrees;
        rec.entity.setEulerAngles(0, degrees, 0);
    }

    function nudgeSelectedRotation(deltaDegrees) {
        const rec = selectedPlaceholderId ? placeholderRegistry.get(selectedPlaceholderId) : null;
        if (!rec) return;
        rec.yaw += deltaDegrees;
        rec.entity.setEulerAngles(0, rec.yaw, 0);
    }

    function getSelectedPlaceholderScale() {
        const rec = selectedPlaceholderId ? placeholderRegistry.get(selectedPlaceholderId) : null;
        if (!rec) return { x: 1, y: 1, z: 1 };
        const s = rec.entity.getLocalScale();
        return { x: s.x, y: s.y, z: s.z };
    }

    function setSelectedPlaceholderScale(x, y, z) {
        const rec = selectedPlaceholderId ? placeholderRegistry.get(selectedPlaceholderId) : null;
        if (!rec) return;
        const sx = Number(x);
        const sy = Number(y);
        const sz = Number(z);
        if (Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz)) {
            const scale = Math.max(0.01, Math.min(10, sx));
            const scaleY = Math.max(0.01, Math.min(10, sy));
            const scaleZ = Math.max(0.01, Math.min(10, sz));
            rec.entity.setLocalScale(scale, scaleY, scaleZ);
        }
    }

    function deleteSelectedPlaceholder() {
        if (selectedPlaceholderId) {
            removePlaceholder(selectedPlaceholderId);
            selectedPlaceholderId = null;
        }
    }

    function setPlacementPlaneVisible(visible) {
        placementPlaneVisible = !!visible;
        if (placementPlaneEntity) placementPlaneEntity.enabled = placementPlaneVisible;
    }

    function getPlacementPlaneConfig() {
        return {
            visible: placementPlaneVisible,
            y: placementPlaneY,
            rotationY: placementPlaneRotationY,
            width: placementPlaneWidth,
            length: placementPlaneLength
        };
    }

    function setPlacementPlaneY(y) {
        const next = Number(y);
        if (!Number.isFinite(next)) return;
        placementPlaneY = next;
        if (placementPlaneEntity) {
            const p = placementPlaneEntity.getPosition();
            placementPlaneEntity.setPosition(p.x, placementPlaneY, p.z);
        }
        for (const [, rec] of placeholderRegistry) {
            const p = rec.entity.getPosition();
            rec.entity.setPosition(p.x, placementPlaneY + rec.yOffset, p.z);
        }
    }

    function setPlacementPlaneRotationY(degrees) {
        const next = Number(degrees);
        if (!Number.isFinite(next)) return;
        placementPlaneRotationY = next;
        if (placementPlaneEntity) placementPlaneEntity.setEulerAngles(0, placementPlaneRotationY, 0);
    }

    function setPlacementPlaneSize(width, length) {
        const w = Number(width);
        const l = Number(length);
        if (!Number.isFinite(w) || !Number.isFinite(l)) return;
        placementPlaneWidth = Math.max(0.1, w);
        placementPlaneLength = Math.max(0.1, l);
        if (placementPlaneEntity) placementPlaneEntity.setLocalScale(placementPlaneWidth, 1, placementPlaneLength);
    }

    function updatePlaceholderDrag(screenX, screenY) {
        if (!draggingPlaceholderId) return;
        const rec = placeholderRegistry.get(draggingPlaceholderId);
        if (!rec) return;
        const pos = screenToPlanePosition(screenX, screenY);
        if (!pos) return;
        const planeY = getPlacementPlaneY();
        const clamped = clampToPlaneBounds(pos.x, pos.z);
        rec.entity.setPosition(clamped.x, planeY + rec.yOffset, clamped.z);
    }

    function endPlaceholderDrag() {
        draggingPlaceholderId = null;
    }

    function isDraggingPlaceholder() {
        return !!draggingPlaceholderId;
    }

    function consumePlaceholderInteraction(e) {
        if (e.type === 'mousedown' && e.buttons === 1) {
            if (placementMode) {
                placePlaceholderAtScreen(e.clientX, e.clientY);
                e.preventDefault();
                e.stopPropagation();
                return true;
            }
            const hit = getPlaceholderAtScreen(e.clientX, e.clientY);
            if (hit) {
                selectedPlaceholderId = hit.id;
                draggingPlaceholderId = hit.id;
                e.preventDefault();
                e.stopPropagation();
                return true;
            }
            selectedPlaceholderId = null;
            return false;
        }
        if (e.type === 'mousemove' && draggingPlaceholderId) {
            updatePlaceholderDrag(e.clientX, e.clientY);
            e.preventDefault();
            e.stopPropagation();
            return true;
        }
        if (e.type === 'mouseup' && draggingPlaceholderId) {
            endPlaceholderDrag();
            e.preventDefault();
            e.stopPropagation();
            return true;
        }
        return false;
    }

    const onMouseDown = (e) => { if (consumePlaceholderInteraction(e)) return; };
    const onMouseMove = (e) => { consumePlaceholderInteraction(e); };
    const onMouseUp = (e) => { consumePlaceholderInteraction(e); };

    canvas.addEventListener('mousedown', onMouseDown, true);
    canvas.addEventListener('mousemove', onMouseMove, true);
    canvas.addEventListener('mouseup', onMouseUp, true);

    function destroy() {
        canvas.removeEventListener('mousedown', onMouseDown, true);
        canvas.removeEventListener('mousemove', onMouseMove, true);
        canvas.removeEventListener('mouseup', onMouseUp, true);
        if (placementPlaneEntity && placementPlaneEntity.destroy) placementPlaneEntity.destroy();
        for (const [, rec] of placeholderRegistry) rec.entity.destroy();
        placeholderRegistry.clear();
    }

    return {
        destroy,
        enterPlacementMode,
        cancelPlacementMode,
        getPlacementMode,
        getPlaceholders,
        getSelectedPlaceholder,
        getSelectedPlaceholderYaw,
        setSelectedPlaceholderYaw,
        nudgeSelectedRotation,
        deleteSelectedPlaceholder,
        setPlacementPlaneVisible,
        getPlacementPlaneConfig,
        setPlacementPlaneY,
        setPlacementPlaneRotationY,
        setPlacementPlaneSize,
        getSelectedPlaceholderScale,
        setSelectedPlaceholderScale,
        isDraggingPlaceholder
    };
}
