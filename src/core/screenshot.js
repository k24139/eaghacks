/** Read the game framebuffer in the same task as its final WebGL draw.
 * preserveDrawingBuffer=false makes reads in a later input/timer task blank.
 * Wrapping lasts one present (at most timeoutMs) and is cancelled on disable.
 */
export function captureGameCanvas(canvas, timeoutMs = 2000) {
  let gl;
  try { gl = canvas.getContext('webgl2'); } catch {}
  if (!gl) return { result: Promise.resolve().then(() => canvas.toDataURL('image/png')), cancel() {} };
  const original = gl.drawArrays;
  let timer, rejectCapture, finished = false;
  function cleanup() {
    clearTimeout(timer);
    if (gl.drawArrays === draw) gl.drawArrays = original;
  }
  function cancel() {
    if (finished) return;
    finished = true; cleanup(); rejectCapture(new Error('screenshot cancelled'));
  }
  let resolveCapture;
  function draw(mode, first, count) {
    const value = original.call(this, mode, first, count);
    if (!finished && mode === gl.TRIANGLES && first === 0 && count === 3 && gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) {
      finished = true;
      try { resolveCapture(canvas.toDataURL('image/png')); }
      catch (err) { rejectCapture(err); }
      finally { cleanup(); }
    }
    return value;
  }
  const result = new Promise((resolve, reject) => {
    resolveCapture = resolve; rejectCapture = reject;
    timer = setTimeout(() => {
      if (finished) return;
      finished = true; cleanup(); reject(new Error('no completed game frame within screenshot timeout'));
    }, timeoutMs);
    gl.drawArrays = draw;
  });
  return { result, cancel };
}
