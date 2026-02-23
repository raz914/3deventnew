import * as pc from 'playcanvas';
import { registerOrbitCamera } from './orbitCamera.js';
import { initPlaceholderSystem } from './placeholderSystem.js';

const INITIAL_CAM = {
    position: { x: -1.134, y: 3.2, z: 4.127 },
    target: { x: 0.128, y: 0.731, z: -0.487 },
    yaw: -15.3,
    pitch: 27.3,
    distance: 5.383
};

const HOTSPOT_POSITIONS = [
    new pc.Vec3(-0.59, 0.95, 0.06),
    new pc.Vec3(0.42, 1.24, -2.32),
    new pc.Vec3(1.69, 0.93, 0.64)
];

const HOTSPOT1_SPLAT_URL = '/Maniero Concrete Area.sog';

// Initial camera when Hotspot 1 (Edit Area) loads – position, lookAt from panel
const HOTSPOT1_CAM = {
    position: { x: 1.797, y: 1.892, z: -3.851 },
    target: { x: 0.662, y: 1.053, z: -1.068 }
};

// Euler angles (degrees) for splats – editable via utility panel
const mainSplatEuler = { x: 180, y: 0, z: 0 };
const hotspotSplatEulers = [{ x: 175, y: 0, z: 0 }];

// Camera pan bounds (target/lookAt clamped to this AABB); covers main + hotspot targets
const PAN_BOUNDS = {
    minX: -2, minY: 0, minZ: -4,
    maxX: 3, maxY: 2.5, maxZ: 1
};
const CAMERA_DISTANCE_MIN = 0.5;
const CAMERA_DISTANCE_MAX = 20;

/**
 * Initialize the PlayCanvas splat viewer in the given container.
 * @param {Object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {HTMLElement} [options.loadingEl]
 * @param {HTMLElement} [options.backButtonEl]
 * @param {HTMLElement} [options.hotspotsEl]
 * @param {HTMLElement[]} [options.hotspotWrappers] - Array of 3 elements
 * @param {() => void} [options.onBack]
 * @param {string} [options.mainSplatUrl='/mainScene.sog']
 * @returns {{ destroy: () => void }}
 */
export function initSplatViewer(options) {
    const {
        canvas,
        loadingEl,
        backButtonEl,
        hotspotsEl,
        hotspotWrappers = [],
        onBack,
        mainSplatUrl = '/mainScene.sog'
    } = options;

    if (!canvas) {
        console.error('splatViewer: canvas is required');
        return { destroy: () => {} };
    }

    const app = new pc.Application(canvas, {
        mouse: new pc.Mouse(canvas),
        touch: new pc.TouchDevice(canvas),
        keyboard: new pc.Keyboard(window),
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    // Performance: cap device pixel ratio to reduce fill rate (e.g. avoid 3x on high-DPI)
    const device = app.graphicsDevice;
    if (device && typeof window !== 'undefined') {
        device.maxPixelRatio = Math.min(2, window.devicePixelRatio || 1);
    }

    // Performance: limit frame rate to 35 FPS to save CPU/GPU
    const TARGET_FPS = 35;
    const MIN_FRAME_MS = 1000 / TARGET_FPS;
    let lastRenderTime = 0;
    const originalTick = app.tick.bind(app);
    app.tick = function (timestamp, xrFrame) {
        const now = typeof timestamp === 'number' ? timestamp : (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (lastRenderTime !== 0 && (now - lastRenderTime) < MIN_FRAME_MS) {
            app.requestAnimationFrame();
            return;
        }
        lastRenderTime = now;
        originalTick(timestamp, xrFrame);
    };

    const resizeHandler = () => app.resizeCanvas();
    window.addEventListener('resize', resizeHandler);

    registerOrbitCamera(app, canvas);

    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
        clearColor: new pc.Color(0.1, 0.1, 0.1),
        farClip: 1000
    });
    app.root.addChild(camera);

    camera.addComponent('script');
    camera.script.create('orbitCamera');
    const orbitScript = camera.script.orbitCamera;
    orbitScript.initialYaw = INITIAL_CAM.yaw;
    orbitScript.initialPitch = INITIAL_CAM.pitch;
    orbitScript.initialDistance = INITIAL_CAM.distance;
    orbitScript.initialTargetX = INITIAL_CAM.target.x;
    orbitScript.initialTargetY = INITIAL_CAM.target.y;
    orbitScript.initialTargetZ = INITIAL_CAM.target.z;
    orbitScript.usePanBounds = true;
    orbitScript.panBoundsMinX = PAN_BOUNDS.minX;
    orbitScript.panBoundsMinY = PAN_BOUNDS.minY;
    orbitScript.panBoundsMinZ = PAN_BOUNDS.minZ;
    orbitScript.panBoundsMaxX = PAN_BOUNDS.maxX;
    orbitScript.panBoundsMaxY = PAN_BOUNDS.maxY;
    orbitScript.panBoundsMaxZ = PAN_BOUNDS.maxZ;
    orbitScript.distanceMin = CAMERA_DISTANCE_MIN;
    orbitScript.distanceMax = CAMERA_DISTANCE_MAX;

    camera.setPosition(INITIAL_CAM.position.x, INITIAL_CAM.position.y, INITIAL_CAM.position.z);
    camera.lookAt(INITIAL_CAM.target.x, INITIAL_CAM.target.y, INITIAL_CAM.target.z);

    app.start();

    let mainSplatEntity = null;
    let hotspot1SplatEntity = null;
    let showBoundsBox = false;

    function createBoundsBoxEntity() {
        const geometry = new pc.BoxGeometry();
        const mesh = pc.Mesh.fromGeometry(app.graphicsDevice, geometry);
        const material = new pc.StandardMaterial();
        material.emissive = new pc.Color(0.2, 1, 0.3);
        material.useLighting = false;
        material.update();
        const meshInstance = new pc.MeshInstance(mesh, material);
        meshInstance.renderStyle = pc.RENDERSTYLE_WIREFRAME;
        const entity = new pc.Entity('boundsBox');
        entity.addComponent('render', { meshInstances: [meshInstance] });
        entity.enabled = false;
        app.root.addChild(entity);
        return entity;
    }

    function updateBoundsBoxTransform(entity) {
        const orbit = camera.script?.orbitCamera;
        if (!orbit || !entity) return;
        const minX = orbit.panBoundsMinX;
        const minY = orbit.panBoundsMinY;
        const minZ = orbit.panBoundsMinZ;
        const maxX = orbit.panBoundsMaxX;
        const maxY = orbit.panBoundsMaxY;
        const maxZ = orbit.panBoundsMaxZ;
        const cx = (minX + maxX) * 0.5;
        const cy = (minY + maxY) * 0.5;
        const cz = (minZ + maxZ) * 0.5;
        const sx = Math.max(0.01, maxX - minX);
        const sy = Math.max(0.01, maxY - minY);
        const sz = Math.max(0.01, maxZ - minZ);
        entity.setPosition(cx, cy, cz);
        entity.setLocalScale(sx, sy, sz);
    }

    const boundsBoxEntity = createBoundsBoxEntity();

    const placeholderApi = initPlaceholderSystem({
        app,
        canvas,
        camera,
        defaultBounds: PAN_BOUNDS
    });

    function getCameraBoundsConfig() {
        const orbit = camera.script?.orbitCamera;
        if (!orbit) return null;
        return {
            usePanBounds: orbit.usePanBounds,
            panBoundsMinX: orbit.panBoundsMinX,
            panBoundsMinY: orbit.panBoundsMinY,
            panBoundsMinZ: orbit.panBoundsMinZ,
            panBoundsMaxX: orbit.panBoundsMaxX,
            panBoundsMaxY: orbit.panBoundsMaxY,
            panBoundsMaxZ: orbit.panBoundsMaxZ,
            distanceMin: orbit.distanceMin,
            distanceMax: orbit.distanceMax,
            keyPanSpeed: orbit.keyPanSpeed,
            showBoundsBox
        };
    }

    function setCameraBoundsConfig(config) {
        const orbit = camera.script?.orbitCamera;
        if (!orbit) return;
        if (config.usePanBounds !== undefined) orbit.usePanBounds = config.usePanBounds;
        if (config.panBoundsMinX !== undefined) orbit.panBoundsMinX = config.panBoundsMinX;
        if (config.panBoundsMinY !== undefined) orbit.panBoundsMinY = config.panBoundsMinY;
        if (config.panBoundsMinZ !== undefined) orbit.panBoundsMinZ = config.panBoundsMinZ;
        if (config.panBoundsMaxX !== undefined) orbit.panBoundsMaxX = config.panBoundsMaxX;
        if (config.panBoundsMaxY !== undefined) orbit.panBoundsMaxY = config.panBoundsMaxY;
        if (config.panBoundsMaxZ !== undefined) orbit.panBoundsMaxZ = config.panBoundsMaxZ;
        if (config.distanceMin !== undefined) orbit.distanceMin = config.distanceMin;
        if (config.distanceMax !== undefined) orbit.distanceMax = config.distanceMax;
        if (config.keyPanSpeed !== undefined) orbit.keyPanSpeed = config.keyPanSpeed;
        if (config.showBoundsBox !== undefined) {
            showBoundsBox = config.showBoundsBox;
            boundsBoxEntity.enabled = showBoundsBox;
        }
        updateBoundsBoxTransform(boundsBoxEntity);
    }

    function hideLoadingScreen() {
        if (loadingEl) {
            loadingEl.classList.add('splat-viewer__loading--hidden');
            setTimeout(() => { loadingEl.style.display = 'none'; }, 400);
        }
    }

    function showLoadingScreen() {
        if (loadingEl) {
            loadingEl.classList.remove('splat-viewer__loading--hidden');
            loadingEl.style.display = 'flex';
        }
    }

    function applyCameraState(position, target) {
        const orbit = camera.script?.orbitCamera;
        if (!orbit) return;
        const dx = position.x - target.x;
        const dy = position.y - target.y;
        const dz = position.z - target.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const dirX = dx / distance;
        const dirY = dy / distance;
        const dirZ = dz / distance;
        const pitchRad = Math.asin(dirY);
        const yawRad = Math.atan2(dirX, dirZ);
        const pitch = pitchRad * pc.math.RAD_TO_DEG;
        const yaw = yawRad * pc.math.RAD_TO_DEG;
        orbit.target.set(target.x, target.y, target.z);
        orbit._targetTarget.set(target.x, target.y, target.z);
        orbit.yaw = yaw;
        orbit._targetYaw = yaw;
        orbit.pitch = pitch;
        orbit._targetPitch = pitch;
        orbit.distance = distance;
        orbit._targetDistance = distance;
        camera.setPosition(position.x, position.y, position.z);
        camera.lookAt(target.x, target.y, target.z);
    }

    function showHotspotScene() {
        inHotspotView = true;
        applyCameraState(HOTSPOT1_CAM.position, HOTSPOT1_CAM.target);
        if (hotspotsEl) hotspotsEl.style.display = 'none';
        if (backButtonEl) backButtonEl.style.display = 'block';
    }

    function showMainScene() {
        inHotspotView = false;
        if (hotspot1SplatEntity) hotspot1SplatEntity.enabled = false;
        if (mainSplatEntity) mainSplatEntity.enabled = true;
        if (hotspotsEl) hotspotsEl.style.display = '';
    }

    let inHotspotView = false;
    if (backButtonEl) {
        const handleBack = () => {
            if (inHotspotView) {
                showMainScene();
                inHotspotView = false;
            } else {
                onBack?.();
            }
        };
        backButtonEl.addEventListener('click', handleBack);
        backButtonEl.style.display = 'block';
    }

    // Hotspot 1 click: load and show hotspot splat
    if (hotspotWrappers[0]) {
        hotspotWrappers[0].addEventListener('click', (e) => {
            e.stopPropagation();
            if (hotspot1SplatEntity) {
                hotspot1SplatEntity.enabled = !hotspot1SplatEntity.enabled;
                if (mainSplatEntity) mainSplatEntity.enabled = !hotspot1SplatEntity.enabled;
                if (hotspot1SplatEntity.enabled) showHotspotScene(); else showMainScene();
                return;
            }
            showLoadingScreen();
            app.assets.loadFromUrl(HOTSPOT1_SPLAT_URL, 'gsplat', (err, asset) => {
                if (err) {
                    console.error('Failed to load Hotspot 1 splat:', err);
                    hideLoadingScreen();
                    return;
                }
                if (mainSplatEntity) mainSplatEntity.enabled = false;
                hotspot1SplatEntity = new pc.Entity('hotspot1Splat');
                hotspot1SplatEntity.addComponent('gsplat', { asset: asset });
                const h0 = hotspotSplatEulers[0];
                hotspot1SplatEntity.setEulerAngles(h0.x, h0.y, h0.z);
                app.root.addChild(hotspot1SplatEntity);
                showHotspotScene();
                hideLoadingScreen();
            });
        });
    }

    const screenVec = new pc.Vec3();
    const defaultSize = 40;
    app.on('update', () => {
        const cam = camera.camera;
        if (!cam) return;
        const device = app.graphicsDevice;
        const rect = device.clientRect;
        const deviceW = rect.width;
        const deviceH = rect.height;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const scaleX = deviceW > 0 ? cssW / deviceW : 1;
        const scaleY = deviceH > 0 ? cssH / deviceH : 1;
        const size = defaultSize;
        for (let i = 0; i < HOTSPOT_POSITIONS.length; i++) {
            const v = HOTSPOT_POSITIONS[i];
            cam.worldToScreen(v, screenVec);
            const margin = 50;
            const visible = screenVec.z > 0 &&
                screenVec.x >= -margin && screenVec.x <= deviceW + margin &&
                screenVec.y >= -margin && screenVec.y <= deviceH + margin;
            const wrap = hotspotWrappers[i];
            if (!wrap) continue;
            const marker = wrap.querySelector('.hotspot-marker');
            if (marker) {
                marker.style.width = size + 'px';
                marker.style.height = size + 'px';
            }
            if (visible) {
                wrap.style.left = (screenVec.x * scaleX) + 'px';
                wrap.style.top = (screenVec.y * scaleY) + 'px';
                wrap.classList.add('visible');
            } else {
                wrap.classList.remove('visible');
            }
        }
    });

    app.on('update', function applyInitialCamera() {
        app.off('update', applyInitialCamera);
        const orbit = camera.script.orbitCamera;
        if (orbit) {
            orbit.yaw = INITIAL_CAM.yaw;
            orbit.pitch = INITIAL_CAM.pitch;
            orbit.distance = INITIAL_CAM.distance;
            orbit.target.set(INITIAL_CAM.target.x, INITIAL_CAM.target.y, INITIAL_CAM.target.z);
            orbit._targetYaw = INITIAL_CAM.yaw;
            orbit._targetPitch = INITIAL_CAM.pitch;
            orbit._targetDistance = INITIAL_CAM.distance;
            orbit._targetTarget.set(INITIAL_CAM.target.x, INITIAL_CAM.target.y, INITIAL_CAM.target.z);
        }
        camera.setPosition(INITIAL_CAM.position.x, INITIAL_CAM.position.y, INITIAL_CAM.position.z);
        camera.lookAt(INITIAL_CAM.target.x, INITIAL_CAM.target.y, INITIAL_CAM.target.z);
    });

    app.assets.loadFromUrl(mainSplatUrl, 'gsplat', (err, asset) => {
        if (err) {
            console.error('Failed to load Gaussian Splat:', err);
            hideLoadingScreen();
            return;
        }
        mainSplatEntity = new pc.Entity('gaussianSplat');
        mainSplatEntity.addComponent('gsplat', { asset: asset });
        mainSplatEntity.setEulerAngles(mainSplatEuler.x, mainSplatEuler.y, mainSplatEuler.z);
        app.root.addChild(mainSplatEntity);
        hideLoadingScreen();
    });

    function getEulerState() {
        return {
            main: { ...mainSplatEuler },
            hotspot0: hotspotSplatEulers[0] ? { ...hotspotSplatEulers[0] } : null
        };
    }

    function setMainSplatEuler(x, y, z) {
        mainSplatEuler.x = x;
        mainSplatEuler.y = y;
        mainSplatEuler.z = z;
        if (mainSplatEntity) mainSplatEntity.setEulerAngles(x, y, z);
    }

    function setHotspotSplatEuler(hotspotIndex, x, y, z) {
        if (hotspotIndex === 0 && hotspotSplatEulers[0]) {
            hotspotSplatEulers[0].x = x;
            hotspotSplatEulers[0].y = y;
            hotspotSplatEulers[0].z = z;
            if (hotspot1SplatEntity) hotspot1SplatEntity.setEulerAngles(x, y, z);
        }
    }

    function getCameraState() {
        const orbit = camera.script?.orbitCamera;
        if (!orbit) return null;
        const pos = camera.getPosition();
        const target = orbit.target;
        const euler = camera.getEulerAngles();
        return {
            position: { x: pos.x, y: pos.y, z: pos.z },
            target: { x: target.x, y: target.y, z: target.z },
            rotation: { x: euler.x, y: euler.y, z: euler.z }
        };
    }

    return {
        destroy() {
            placeholderApi.destroy();
            window.removeEventListener('resize', resizeHandler);
            app.destroy();
        },
        getEulerState,
        setMainSplatEuler,
        setHotspotSplatEuler,
        getCameraState,
        getCameraBoundsConfig,
        setCameraBoundsConfig,
        enterPlacementMode: placeholderApi.enterPlacementMode,
        cancelPlacementMode: placeholderApi.cancelPlacementMode,
        getPlacementMode: placeholderApi.getPlacementMode,
        getPlaceholders: placeholderApi.getPlaceholders,
        getSelectedPlaceholder: placeholderApi.getSelectedPlaceholder,
        getSelectedPlaceholderYaw: placeholderApi.getSelectedPlaceholderYaw,
        setSelectedPlaceholderYaw: placeholderApi.setSelectedPlaceholderYaw,
        nudgeSelectedRotation: placeholderApi.nudgeSelectedRotation,
        getSelectedPlaceholderScale: placeholderApi.getSelectedPlaceholderScale,
        setSelectedPlaceholderScale: placeholderApi.setSelectedPlaceholderScale,
        deleteSelectedPlaceholder: placeholderApi.deleteSelectedPlaceholder,
        setPlacementPlaneVisible: placeholderApi.setPlacementPlaneVisible,
        getPlacementPlaneConfig: placeholderApi.getPlacementPlaneConfig,
        setPlacementPlaneY: placeholderApi.setPlacementPlaneY,
        setPlacementPlaneRotationY: placeholderApi.setPlacementPlaneRotationY,
        setPlacementPlaneSize: placeholderApi.setPlacementPlaneSize,
        isDraggingPlaceholder: placeholderApi.isDraggingPlaceholder
    };
}
