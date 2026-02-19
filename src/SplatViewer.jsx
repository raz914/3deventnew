import { useEffect, useRef, useState } from 'react';
import { initSplatViewer } from './splatViewer.js';
import HotspotEulerPanel from './components/HotspotEulerPanel';
import './SplatViewer.css';

export default function SplatViewer({ onBack }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const loadingRef = useRef(null);
  const backRef = useRef(null);
  const hotspotsRef = useRef(null);
  const hotspot0Ref = useRef(null);
  const hotspot1Ref = useRef(null);
  const hotspot2Ref = useRef(null);
  const destroyRef = useRef(null);
  const [viewerApi, setViewerApi] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const api = initSplatViewer({
      canvas,
      loadingEl: loadingRef.current,
      backButtonEl: backRef.current,
      hotspotsEl: hotspotsRef.current,
      hotspotWrappers: [hotspot0Ref.current, hotspot1Ref.current, hotspot2Ref.current].filter(Boolean),
      onBack,
    });
    destroyRef.current = api;
    setViewerApi(api);

    return () => {
      if (destroyRef.current) {
        destroyRef.current.destroy();
        destroyRef.current = null;
      }
      setViewerApi(null);
    };
  }, [onBack]);

  return (
    <div ref={containerRef} className="splat-viewer" aria-label="3D splat viewer">
      <div
        ref={loadingRef}
        className="splat-viewer__loading"
        aria-live="polite"
      >
        <div className="splat-viewer__loading-bar-track">
          <div className="splat-viewer__loading-bar" />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="splat-viewer__canvas"
        id="application-canvas"
      />
      <button
        ref={backRef}
        type="button"
        className="splat-viewer__back"
        onClick={onBack}
        aria-label="Back to main scene"
      >
        Back
      </button>
   {/*  <HotspotEulerPanel api={viewerApi} /> */}
      <div ref={hotspotsRef} className="splat-viewer__hotspots" aria-hidden="true">
        <div
          ref={hotspot0Ref}
          className="splat-viewer__hotspot-wrap splat-viewer__hotspot-wrap--clickable"
          data-hotspot="0"
        >
          <div className="splat-viewer__hotspot-button">
            <div className="splat-viewer__hotspot-label">Edit Area</div>
            <div className="splat-viewer__hotspot-line" />
          </div>
          <div className="splat-viewer__hotspot-marker" />
        </div>
        <div ref={hotspot1Ref} className="splat-viewer__hotspot-wrap" data-hotspot="1">
          <div className="splat-viewer__hotspot-button">
            <div className="splat-viewer__hotspot-label">Edit Area</div>
            <div className="splat-viewer__hotspot-line" />
          </div>
          <div className="splat-viewer__hotspot-marker" />
        </div>
        <div ref={hotspot2Ref} className="splat-viewer__hotspot-wrap" data-hotspot="2">
          <div className="splat-viewer__hotspot-button">
            <div className="splat-viewer__hotspot-label">Edit Area</div>
            <div className="splat-viewer__hotspot-line" />
          </div>
          <div className="splat-viewer__hotspot-marker" />
        </div>
      </div>
    </div>
  );
}
