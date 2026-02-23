import { useState, useEffect } from 'react';

const BUILTIN_TYPES = [
  { id: 'chair', label: 'Chair' },
  { id: 'table', label: 'Table' },
];

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function PlaceholdersPanel({ api, className = '' }) {
  const [open, setOpen] = useState(true);
  const [customTypes, setCustomTypes] = useState([]);
  const [customNameInput, setCustomNameInput] = useState('');
  const [placementType, setPlacementType] = useState(null);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [selectedYaw, setSelectedYaw] = useState(0);
  const [selectedScale, setSelectedScale] = useState({ x: 1, y: 1, z: 1 });
  const [planeVisible, setPlaneVisible] = useState(true);
  const [planeY, setPlaneY] = useState(1.1);
  const [planeRotationY, setPlaneRotationY] = useState(27);
  const [planeWidth, setPlaneWidth] = useState(6.1);
  const [planeLength, setPlaneLength] = useState(3.1);

  const loadState = () => {
    if (!api?.getPlaceholders) return;
    const mode = api.getPlacementMode?.() ?? null;
    const planeCfg = api.getPlacementPlaneConfig?.() ?? null;
    const sel = api.getSelectedPlaceholder?.() ?? null;
    setPlacementType(mode ? { id: mode.typeId, name: mode.displayName } : null);
    setSelectedPlaceholder(sel);
    if (planeCfg) {
      setPlaneVisible(!!planeCfg.visible);
      setPlaneY(planeCfg.y);
      setPlaneRotationY(planeCfg.rotationY ?? 0);
      setPlaneWidth(planeCfg.width ?? 5);
      setPlaneLength(planeCfg.length ?? 5);
    }
    if (sel) {
      const yaw = api.getSelectedPlaceholderYaw?.() ?? 0;
      setSelectedYaw(yaw);
      const scale = api.getSelectedPlaceholderScale?.() ?? { x: 1, y: 1, z: 1 };
      setSelectedScale(scale);
    }
  };

  useEffect(() => {
    loadState();
  }, [api]);

  useEffect(() => {
    if (!api || !open) return;
    loadState();
    const id = setInterval(loadState, 500);
    return () => clearInterval(id);
  }, [api, open]);

  const handleAddCustomType = () => {
    const name = customNameInput.trim();
    if (!name) return;
    setCustomTypes((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setCustomNameInput('');
  };

  const handleRemoveCustomType = (name) => {
    setCustomTypes((prev) => prev.filter((n) => n !== name));
  };

  const handlePlace = (typeId, displayName) => {
    if (placementType?.id === typeId && placementType?.name === displayName) {
      api?.cancelPlacementMode?.();
      setPlacementType(null);
    } else {
      api?.enterPlacementMode?.(typeId, displayName);
      setPlacementType({ id: typeId, name: displayName });
    }
  };

  const handleRotateLeft = () => {
    api?.nudgeSelectedRotation?.(-15);
    loadState();
  };

  const handleRotateRight = () => {
    api?.nudgeSelectedRotation?.(15);
    loadState();
  };

  const handleYawChange = (e) => {
    const v = toNum(e.target.value, selectedYaw);
    setSelectedYaw(v);
    api?.setSelectedPlaceholderYaw?.(v);
  };

  const handleScaleChange = (axis) => (e) => {
    const v = toNum(e.target.value, selectedScale[axis]);
    const next = { ...selectedScale, [axis]: v };
    setSelectedScale(next);
    api?.setSelectedPlaceholderScale?.(next.x, next.y, next.z);
  };

  const handleUniformScale = (e) => {
    const v = toNum(e.target.value, selectedScale.x);
    const next = { x: v, y: v, z: v };
    setSelectedScale(next);
    api?.setSelectedPlaceholderScale?.(v, v, v);
  };

  const handleDeleteSelected = () => {
    api?.deleteSelectedPlaceholder?.();
    setSelectedPlaceholder(null);
    loadState();
  };

  const handlePlaneVisible = (e) => {
    const next = e.target.checked;
    setPlaneVisible(next);
    api?.setPlacementPlaneVisible?.(next);
  };

  const handlePlaneY = (e) => {
    const next = toNum(e.target.value, planeY);
    setPlaneY(next);
    api?.setPlacementPlaneY?.(next);
  };

  const handlePlaneRotationY = (e) => {
    const next = toNum(e.target.value, planeRotationY);
    setPlaneRotationY(next);
    api?.setPlacementPlaneRotationY?.(next);
  };

  const handlePlaneWidth = (e) => {
    const next = toNum(e.target.value, planeWidth);
    setPlaneWidth(next);
    api?.setPlacementPlaneSize?.(next, planeLength);
  };

  const handlePlaneLength = (e) => {
    const next = toNum(e.target.value, planeLength);
    setPlaneLength(next);
    api?.setPlacementPlaneSize?.(planeWidth, next);
  };

  if (!api) return null;

  return (
    <div className={`splat-viewer__euler-panel splat-viewer__placeholders-panel ${className}`.trim()}>
      <button
        type="button"
        className="splat-viewer__euler-panel-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Placeholders
        <span className="splat-viewer__euler-panel-chevron">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="splat-viewer__euler-panel-body">
          <p className="splat-viewer__euler-panel-hint">Click a type to place on the plane. Click on the scene to spawn.</p>

          <label className="splat-viewer__euler-panel-label">Place</label>
          <div className="splat-viewer__placeholders-list">
            {BUILTIN_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`splat-viewer__placeholders-item ${placementType?.id === t.id && placementType?.name === t.label ? 'splat-viewer__placeholders-item--active' : ''}`}
                onClick={() => handlePlace(t.id, t.label)}
              >
                {t.label}
              </button>
            ))}
            {customTypes.map((name) => (
              <div key={name} className="splat-viewer__placeholders-row">
                <button
                  type="button"
                  className={`splat-viewer__placeholders-item ${placementType?.id === 'custom' && placementType?.name === name ? 'splat-viewer__placeholders-item--active' : ''}`}
                  onClick={() => handlePlace('custom', name)}
                >
                  {name}
                </button>
                <button
                  type="button"
                  className="splat-viewer__placeholders-remove"
                  onClick={() => handleRemoveCustomType(name)}
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <label className="splat-viewer__euler-panel-label">Custom type</label>
          <div className="splat-viewer__euler-panel-row">
            <input
              type="text"
              className="splat-viewer__euler-panel-input"
              placeholder="Name"
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomType()}
            />
            <button type="button" className="splat-viewer__placeholders-add" onClick={handleAddCustomType}>
              Add
            </button>
          </div>

          <label className="splat-viewer__euler-panel-label">Placement plane (debug)</label>
          <div className="splat-viewer__euler-panel-row">
            <label className="splat-viewer__euler-panel-label" style={{ marginBottom: 0 }}>
              <input type="checkbox" checked={planeVisible} onChange={handlePlaneVisible} />
              {' '}Visible
            </label>
          </div>
          <div className="splat-viewer__euler-panel-row">
            <label className="splat-viewer__euler-panel-axis-label">Y</label>
            <input
              type="number"
              className="splat-viewer__euler-panel-input"
              value={Math.round(planeY * 100) / 100}
              step={0.1}
              onChange={handlePlaneY}
            />
          </div>
          <div className="splat-viewer__euler-panel-row">
            <label className="splat-viewer__euler-panel-axis-label">Rot Y</label>
            <input
              type="number"
              className="splat-viewer__euler-panel-input"
              value={Math.round(planeRotationY * 10) / 10}
              step={5}
              onChange={handlePlaneRotationY}
            />
          </div>
          <div className="splat-viewer__euler-panel-row">
            <label className="splat-viewer__euler-panel-axis-label">W</label>
            <input
              type="number"
              className="splat-viewer__euler-panel-input"
              value={Math.round(planeWidth * 100) / 100}
              step={0.5}
              min={0.1}
              onChange={handlePlaneWidth}
            />
          </div>
          <div className="splat-viewer__euler-panel-row">
            <label className="splat-viewer__euler-panel-axis-label">L</label>
            <input
              type="number"
              className="splat-viewer__euler-panel-input"
              value={Math.round(planeLength * 100) / 100}
              step={0.5}
              min={0.1}
              onChange={handlePlaneLength}
            />
          </div>

          {selectedPlaceholder && (
            <>
              <label className="splat-viewer__euler-panel-label">Selected: {selectedPlaceholder?.name ?? selectedPlaceholder?.id}</label>
              <div className="splat-viewer__euler-panel-axes">
                <div className="splat-viewer__euler-panel-row">
                  <button type="button" className="splat-viewer__euler-panel-input" onClick={handleRotateLeft}>
                    ← Rotate
                  </button>
                  <button type="button" className="splat-viewer__euler-panel-input" onClick={handleRotateRight}>
                    Rotate →
                  </button>
                </div>
                <div className="splat-viewer__euler-panel-row">
                  <label className="splat-viewer__euler-panel-axis-label">Yaw</label>
                  <input
                    type="number"
                    className="splat-viewer__euler-panel-input"
                    value={Math.round(selectedYaw * 10) / 10}
                    step={5}
                    onChange={handleYawChange}
                  />
                </div>
                <label className="splat-viewer__euler-panel-label">Scale</label>
                <div className="splat-viewer__euler-panel-row">
                  <label className="splat-viewer__euler-panel-axis-label">Uniform</label>
                  <input
                    type="number"
                    className="splat-viewer__euler-panel-input"
                    value={Math.round(selectedScale.x * 100) / 100}
                    step={0.1}
                    min={0.01}
                    max={10}
                    onChange={handleUniformScale}
                  />
                </div>
                <div className="splat-viewer__euler-panel-axes">
                  {['x', 'y', 'z'].map((axis) => (
                    <div key={axis} className="splat-viewer__euler-panel-row">
                      <label className="splat-viewer__euler-panel-axis-label">{axis.toUpperCase()}</label>
                      <input
                        type="number"
                        className="splat-viewer__euler-panel-input"
                        value={Math.round(selectedScale[axis] * 100) / 100}
                        step={0.1}
                        min={0.01}
                        max={10}
                        onChange={handleScaleChange(axis)}
                      />
                    </div>
                  ))}
                </div>
                <div className="splat-viewer__euler-panel-row">
                  <button type="button" className="splat-viewer__placeholders-delete" onClick={handleDeleteSelected}>
                    Delete selected
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
