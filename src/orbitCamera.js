import * as pc from 'playcanvas';

/**
 * Full-featured orbit camera controller.
 *
 * Controls:
 *   Mouse left-drag   → orbit
 *   Mouse right/mid   → pan
 *   Scroll wheel      → zoom
 *   Touch 1-finger    → orbit
 *   Touch pinch       → zoom
 *   Touch 2-finger    → pan
 */
export function registerOrbitCamera(app, canvas) {
    const OrbitCamera = pc.createScript('orbitCamera');

    OrbitCamera.attributes.add('distanceDefault', { type: 'number', default: 5 });
    OrbitCamera.attributes.add('distanceMin', { type: 'number', default: 1 });
    OrbitCamera.attributes.add('distanceMax', { type: 'number', default: 50 });
    OrbitCamera.attributes.add('orbitSensitivity', { type: 'number', default: 0.3 });
    OrbitCamera.attributes.add('panSensitivity', { type: 'number', default: 0.005 });
    OrbitCamera.attributes.add('zoomSensitivity', { type: 'number', default: 0.3 });
    OrbitCamera.attributes.add('inertia', { type: 'number', default: 0.12 });

    // Initial camera state when scene starts (optional)
    OrbitCamera.attributes.add('initialYaw', { type: 'number', default: 0 });
    OrbitCamera.attributes.add('initialPitch', { type: 'number', default: 15 });
    OrbitCamera.attributes.add('initialDistance', { type: 'number', default: -1 }); // -1 = use distanceDefault
    OrbitCamera.attributes.add('initialTargetX', { type: 'number', default: 0 });
    OrbitCamera.attributes.add('initialTargetY', { type: 'number', default: 0 });
    OrbitCamera.attributes.add('initialTargetZ', { type: 'number', default: 0 });

    /* ------------------------------------------------------------------ */
    /*  Initialize                                                        */
    /* ------------------------------------------------------------------ */
    OrbitCamera.prototype.initialize = function () {
        const dist = this.initialDistance >= 0 ? this.initialDistance : this.distanceDefault;
        this.yaw = this.initialYaw;
        this.pitch = this.initialPitch;
        this.distance = dist;
        this.target = new pc.Vec3(this.initialTargetX, this.initialTargetY, this.initialTargetZ);

        this._targetYaw = this.yaw;
        this._targetPitch = this.pitch;
        this._targetDistance = this.distance;
        this._targetTarget = this.target.clone();

        // Track which mouse buttons are held (via native DOM)
        this._buttonsDown = 0;
        this._lastX = 0;
        this._lastY = 0;

        // Touch state
        this._lastTouchDist = 0;
        this._lastTouchMidX = 0;
        this._lastTouchMidY = 0;

        this._addMouseListeners();
        this._addTouchListeners();
    };

    /* ------------------------------------------------------------------ */
    /*  Mouse (native DOM events – most reliable)                         */
    /* ------------------------------------------------------------------ */
    OrbitCamera.prototype._addMouseListeners = function () {
        const self = this;

        canvas.addEventListener('mousedown', (e) => {
            self._buttonsDown = e.buttons;
            self._lastX = e.clientX;
            self._lastY = e.clientY;
        });

        window.addEventListener('mouseup', (e) => {
            self._buttonsDown = e.buttons;
        });

        window.addEventListener('mousemove', (e) => {
            if (self._buttonsDown === 0) return;

            const dx = e.clientX - self._lastX;
            const dy = e.clientY - self._lastY;
            self._lastX = e.clientX;
            self._lastY = e.clientY;

            // Left button (bit 0) → orbit
            if (self._buttonsDown & 1) {
                self._targetYaw -= dx * self.orbitSensitivity;
                self._targetPitch += dy * self.orbitSensitivity;
                self._targetPitch = pc.math.clamp(self._targetPitch, -89, 89);
            }

            // Right (bit 1) or middle (bit 2) → pan
            if (self._buttonsDown & 2 || self._buttonsDown & 4) {
                const panScale = self.panSensitivity * self.distance;
                const right = new pc.Vec3();
                const up = new pc.Vec3();
                self.entity.getWorldTransform().getX(right);
                self.entity.getWorldTransform().getY(up);
                self._targetTarget.add(right.mulScalar(-dx * panScale));
                self._targetTarget.add(up.mulScalar(dy * panScale));
            }
        });

        // Scroll → zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            self._targetDistance += e.deltaY * self.zoomSensitivity * 0.01 * self._targetDistance;
            self._targetDistance = pc.math.clamp(self._targetDistance, self.distanceMin, self.distanceMax);
        }, { passive: false });

        // Disable right-click context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    /* ------------------------------------------------------------------ */
    /*  Touch                                                              */
    /* ------------------------------------------------------------------ */
    OrbitCamera.prototype._addTouchListeners = function () {
        const self = this;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 2) {
                const t0 = e.touches[0], t1 = e.touches[1];
                self._lastTouchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
                self._lastTouchMidX = (t0.clientX + t1.clientX) * 0.5;
                self._lastTouchMidY = (t0.clientY + t1.clientY) * 0.5;
            }
            if (e.touches.length === 1) {
                self._lastX = e.touches[0].clientX;
                self._lastY = e.touches[0].clientY;
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Single finger → orbit
                const dx = e.touches[0].clientX - self._lastX;
                const dy = e.touches[0].clientY - self._lastY;
                self._lastX = e.touches[0].clientX;
                self._lastY = e.touches[0].clientY;

                self._targetYaw -= dx * self.orbitSensitivity;
                self._targetPitch += dy * self.orbitSensitivity;
                self._targetPitch = pc.math.clamp(self._targetPitch, -89, 89);

            } else if (e.touches.length === 2) {
                const t0 = e.touches[0], t1 = e.touches[1];

                // Pinch → zoom
                const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
                if (self._lastTouchDist > 0) {
                    self._targetDistance *= self._lastTouchDist / dist;
                    self._targetDistance = pc.math.clamp(self._targetDistance, self.distanceMin, self.distanceMax);
                }
                self._lastTouchDist = dist;

                // Two-finger drag → pan
                const midX = (t0.clientX + t1.clientX) * 0.5;
                const midY = (t0.clientY + t1.clientY) * 0.5;
                const panDx = midX - self._lastTouchMidX;
                const panDy = midY - self._lastTouchMidY;
                self._lastTouchMidX = midX;
                self._lastTouchMidY = midY;

                const panScale = self.panSensitivity * self.distance;
                const right = new pc.Vec3();
                const up = new pc.Vec3();
                self.entity.getWorldTransform().getX(right);
                self.entity.getWorldTransform().getY(up);
                self._targetTarget.add(right.mulScalar(-panDx * panScale));
                self._targetTarget.add(up.mulScalar(panDy * panScale));
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            self._lastTouchDist = 0;
        });
    };

    /* ------------------------------------------------------------------ */
    /*  Update – smooth interpolation every frame                         */
    /* ------------------------------------------------------------------ */
    OrbitCamera.prototype.update = function (dt) {
        const t = 1.0 - Math.pow(this.inertia, dt * 60);

        this.yaw = pc.math.lerp(this.yaw, this._targetYaw, t);
        this.pitch = pc.math.lerp(this.pitch, this._targetPitch, t);
        this.distance = pc.math.lerp(this.distance, this._targetDistance, t);
        this.target.lerp(this.target, this._targetTarget, t);

        const pitchRad = this.pitch * pc.math.DEG_TO_RAD;
        const yawRad = this.yaw * pc.math.DEG_TO_RAD;

        this.entity.setPosition(
            this.target.x + this.distance * Math.sin(yawRad) * Math.cos(pitchRad),
            this.target.y + this.distance * Math.sin(pitchRad),
            this.target.z + this.distance * Math.cos(yawRad) * Math.cos(pitchRad)
        );

        this.entity.lookAt(this.target);
    };
}
