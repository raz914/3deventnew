import { useState, useEffect } from 'react';

const DEFAULT_CONFIG = {
    usePanBounds: false,
    panBoundsMinX: -2,
    panBoundsMinY: 0,
    panBoundsMinZ: -4,
    panBoundsMaxX: 3,
    panBoundsMaxY: 2.5,
    panBoundsMaxZ: 1,
    distanceMin: 0.5,
    distanceMax: 20,
    keyPanSpeed: 2,
    showBoundsBox: false
};

function toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

export default function CameraBoundsPanel({ api, className = '' }) {
    const [open, setOpen] = useState(true);
    const [config, setConfig] = useState({ ...DEFAULT_CONFIG });

    const loadConfig = () => {
        if (!api?.getCameraBoundsConfig) return;
        const c = api.getCameraBoundsConfig();
        if (c) setConfig((prev) => ({ ...prev, ...c }));
    };

    useEffect(() => {
        loadConfig();
    }, [api]);

    useEffect(() => {
        if (!api || !open) return;
        loadConfig();
        const id = setInterval(loadConfig, 1500);
        return () => clearInterval(id);
    }, [api, open]);

    const apply = (partial) => {
        const next = { ...config, ...partial };
        setConfig(next);
        if (api?.setCameraBoundsConfig) api.setCameraBoundsConfig(partial);
    };

    const handleCheckbox = (key) => (e) => apply({ [key]: e.target.checked });
    const handleNumber = (key) => (e) => apply({ [key]: toNum(e.target.value, config[key]) });

    if (!api) return null;

    return (
        <div className={`splat-viewer__euler-panel ${className}`.trim()}>
            <button
                type="button"
                className="splat-viewer__euler-panel-toggle"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
            >
                Camera bounds
                <span className="splat-viewer__euler-panel-chevron">{open ? '▼' : '▶'}</span>
            </button>
            {open && (
                <div className="splat-viewer__euler-panel-body">
                    <div className="splat-viewer__euler-panel-row">
                        <label className="splat-viewer__euler-panel-label" style={{ marginBottom: 0 }}>
                            <input
                                type="checkbox"
                                checked={config.usePanBounds}
                                onChange={handleCheckbox('usePanBounds')}
                            />
                            {' '}Use pan bounds
                        </label>
                    </div>

                    <label className="splat-viewer__euler-panel-label">Pan bounds min (X, Y, Z)</label>
                    <div className="splat-viewer__euler-panel-axes">
                        {['panBoundsMinX', 'panBoundsMinY', 'panBoundsMinZ'].map((key, i) => (
                            <div key={key} className="splat-viewer__euler-panel-row">
                                <label className="splat-viewer__euler-panel-axis-label">{['X', 'Y', 'Z'][i]}</label>
                                <input
                                    type="number"
                                    className="splat-viewer__euler-panel-input"
                                    value={config[key]}
                                    step={0.5}
                                    onChange={handleNumber(key)}
                                />
                            </div>
                        ))}
                    </div>

                    <label className="splat-viewer__euler-panel-label">Pan bounds max (X, Y, Z)</label>
                    <div className="splat-viewer__euler-panel-axes">
                        {['panBoundsMaxX', 'panBoundsMaxY', 'panBoundsMaxZ'].map((key, i) => (
                            <div key={key} className="splat-viewer__euler-panel-row">
                                <label className="splat-viewer__euler-panel-axis-label">{['X', 'Y', 'Z'][i]}</label>
                                <input
                                    type="number"
                                    className="splat-viewer__euler-panel-input"
                                    value={config[key]}
                                    step={0.5}
                                    onChange={handleNumber(key)}
                                />
                            </div>
                        ))}
                    </div>

                    <label className="splat-viewer__euler-panel-label">Distance min / max</label>
                    <div className="splat-viewer__euler-panel-axes">
                        <div className="splat-viewer__euler-panel-row">
                            <label className="splat-viewer__euler-panel-axis-label">Min</label>
                            <input
                                type="number"
                                className="splat-viewer__euler-panel-input"
                                value={config.distanceMin}
                                min={0.1}
                                step={0.5}
                                onChange={handleNumber('distanceMin')}
                            />
                        </div>
                        <div className="splat-viewer__euler-panel-row">
                            <label className="splat-viewer__euler-panel-axis-label">Max</label>
                            <input
                                type="number"
                                className="splat-viewer__euler-panel-input"
                                value={config.distanceMax}
                                min={0.1}
                                step={0.5}
                                onChange={handleNumber('distanceMax')}
                            />
                        </div>
                    </div>

                    <label className="splat-viewer__euler-panel-label">Key pan speed</label>
                    <div className="splat-viewer__euler-panel-row">
                        <input
                            type="number"
                            className="splat-viewer__euler-panel-input"
                            value={config.keyPanSpeed}
                            min={0}
                            step={0.5}
                            onChange={handleNumber('keyPanSpeed')}
                        />
                    </div>

                    <div className="splat-viewer__euler-panel-row" style={{ marginTop: 10 }}>
                        <label className="splat-viewer__euler-panel-label" style={{ marginBottom: 0 }}>
                            <input
                                type="checkbox"
                                checked={config.showBoundsBox}
                                onChange={handleCheckbox('showBoundsBox')}
                            />
                            {' '}Show bounds box
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
}
