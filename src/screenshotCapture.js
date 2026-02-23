/**
 * Capture a canvas element as a PNG image and trigger a download to the user's Downloads folder.
 *
 * @param {HTMLCanvasElement} canvas - The canvas to capture (e.g. the 3D scene canvas).
 * @param {string} [filename] - Optional filename (without extension). Defaults to "splat-scene-{timestamp}".
 * @returns {boolean} True if capture and download were triggered, false if canvas is invalid.
 */
export function captureCanvasToDownload(canvas, filename) {
  if (!canvas || typeof canvas.toDataURL !== 'function') return false;

  const name = filename || `splat-scene-${Date.now()}`;
  const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
  const dataUrl = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeName}.png`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return true;
}
