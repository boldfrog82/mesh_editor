import { setToast } from '../app/state.js';

export async function encodeKTX2FromCanvas(canvas) {
  setToast('KTX2 encoding not available offline; using PNG fallback');
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({ type: 'image/png', blob });
    }, 'image/png');
  });
}
