import * as pc from 'playcanvas';
import { registerOrbitCamera } from './orbitCamera.js';

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

// Euler angles (degrees) for splats – editable via utility panel
const mainSplatEuler = { x: 180, y: 0, z: 0 };
const hotspotSplatEulers = [{ x: 175, y: 0, z: 0 }];

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

    camera.setPosition(INITIAL_CAM.position.x, INITIAL_CAM.position.y, INITIAL_CAM.position.z);
    camera.lookAt(INITIAL_CAM.target.x, INITIAL_CAM.target.y, INITIAL_CAM.target.z);

    app.start();

    let mainSplatEntity = null;
    let hotspot1SplatEntity = null;

    function hideLoadingScreen() {
        if (loadingEl) {
            loadingEl.classList.add('splat-viewer__loading--hidden');
            setTimeout(() => { loadingEl.style.display = 'none'; }, 400);
        }
    }

    function showHotspotScene() {
        inHotspotView = true;
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
            app.assets.loadFromUrl(HOTSPOT1_SPLAT_URL, 'gsplat', (err, asset) => {
                if (err) {
                    console.error('Failed to load Hotspot 1 splat:', err);
                    return;
                }
                if (mainSplatEntity) mainSplatEntity.enabled = false;
                hotspot1SplatEntity = new pc.Entity('hotspot1Splat');
                hotspot1SplatEntity.addComponent('gsplat', { asset: asset });
                const h0 = hotspotSplatEulers[0];
                hotspot1SplatEntity.setEulerAngles(h0.x, h0.y, h0.z);
                app.root.addChild(hotspot1SplatEntity);
                showHotspotScene();
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

    return {
        destroy() {
            window.removeEventListener('resize', resizeHandler);
            app.destroy();
        },
        getEulerState,
        setMainSplatEuler,
        setHotspotSplatEuler
    };
}
