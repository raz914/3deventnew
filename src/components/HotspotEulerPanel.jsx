import { useState, useEffect } from 'react';

const TARGETS = [
  { id: 'main', label: 'Main scene' },
  { id: 'hotspot0', label: 'Hotspot 1 (Edit Area)' },
];

function clampDegrees(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function formatVec3(v) {
  if (!v) return '—';
  const f = (n) => Number(n).toFixed(3);
  return `${f(v.x)}, ${f(v.y)}, ${f(v.z)}`;
}

export default function HotspotEulerPanel({ api, className = '' }) {
  const [open, setOpen] = useState(true);
  const [target, setTarget] = useState('main');
  const [euler, setEuler] = useState({ x: 180, y: 0, z: 0 });
  const [cameraState, setCameraState] = useState(null);

  useEffect(() => {
    if (!api) return;
    const state = api.getEulerState();
    const data = target === 'main' ? state.main : state.hotspot0;
    if (data) setEuler({ ...data });
  }, [api, target]);

  useEffect(() => {
    if (!api?.getCameraState || !open) return;
    const tick = () => {
      const state = api.getCameraState();
      setCameraState(state);
    };
    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [api, open]);

  const handleChange = (axis, value) => {
    const num = clampDegrees(value);
    setEuler((prev) => {
      const next = { ...prev, [axis]: num };
      if (api) {
        if (target === 'main') api.setMainSplatEuler(next.x, next.y, next.z);
        else api.setHotspotSplatEuler(0, next.x, next.y, next.z);
      }
      return next;
    });
  };

  const syncFromApi = () => {
    if (!api) return;
    const state = api.getEulerState();
    const data = target === 'main' ? state.main : state.hotspot0;
    if (data) setEuler({ ...data });
  };

  if (!api) return null;

  return (
    <div className={`splat-viewer__euler-panel ${className}`.trim()}>
      <button
        type="button"
        className="splat-viewer__euler-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Hotspot rotation
        <span className="splat-viewer__euler-panel-chevron">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="splat-viewer__euler-panel-body">
          <label className="splat-viewer__euler-panel-label">Target</label>
          <select
            className="splat-viewer__euler-panel-select"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {TARGETS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="splat-viewer__euler-panel-axes">
            {(['x', 'y', 'z']).map((axis) => (
              <div key={axis} className="splat-viewer__euler-panel-row">
                <label className="splat-viewer__euler-panel-axis-label">{axis.toUpperCase()}</label>
                <input
                  type="number"
                  className="splat-viewer__euler-panel-input"
                  value={Math.round(euler[axis] * 10) / 10}
                  step={1}
                  onChange={(e) => handleChange(axis, e.target.value)}
                  onBlur={syncFromApi}
                />
              </div>
            ))}
          </div>
          <p className="splat-viewer__euler-panel-hint">Euler angles in degrees. Changes apply live.</p>

          <label className="splat-viewer__euler-panel-label">Camera</label>
          <div className="splat-viewer__euler-panel-camera">
            <div className="splat-viewer__euler-panel-camera-row">
              <span className="splat-viewer__euler-panel-camera-key">Position</span>
              <span className="splat-viewer__euler-panel-camera-value">{cameraState ? formatVec3(cameraState.position) : '—'}</span>
            </div>
            <div className="splat-viewer__euler-panel-camera-row">
              <span className="splat-viewer__euler-panel-camera-key">LookAt</span>
              <span className="splat-viewer__euler-panel-camera-value">{cameraState ? formatVec3(cameraState.target) : '—'}</span>
            </div>
            <div className="splat-viewer__euler-panel-camera-row">
              <span className="splat-viewer__euler-panel-camera-key">Rotation</span>
              <span className="splat-viewer__euler-panel-camera-value">{cameraState ? formatVec3(cameraState.rotation) : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
