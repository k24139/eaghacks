/**
 * Performance statistics.
 *
 * Tracks the client's own frame loop plus the time spent inside module updates,
 * so the Performance Monitor can attribute cost to the client rather than the
 * game. Uses rolling windows rather than `performance.memory` (which is
 * Chromium-only and gated) so it degrades gracefully in Firefox/Safari.
 */
export class Stats {
  constructor({ windowSize = 120 } = {}) {
    this.windowSize = windowSize;
    this._frameTimes = new Float64Array(windowSize);
    this._frameIndex = 0;
    this._frameCount = 0;
    this._lastFrameAt = 0;
    this.fps = 0;
    this.frameTimeMs = 0;
    this.worstFrameMs = 0;
    this.moduleTickMs = 0;
    this.moduleRenderMs = 0;
    this._moduleTickAccum = 0;
    this._moduleRenderAccum = 0;
    this._samples = 0;
    this.startTime = Date.now();
  }

  /** Call once per animation frame. */
  frame(now = performance.now()) {
    if (this._lastFrameAt) {
      const dt = now - this._lastFrameAt;
      this._frameTimes[this._frameIndex] = dt;
      this._frameIndex = (this._frameIndex + 1) % this.windowSize;
      if (this._frameCount < this.windowSize) this._frameCount++;
      this.frameTimeMs = dt;
      if (dt > this.worstFrameMs) this.worstFrameMs = dt;
      // Mean over the window, converted to fps.
      let sum = 0;
      for (let i = 0; i < this._frameCount; i++) sum += this._frameTimes[i];
      const mean = sum / this._frameCount;
      this.fps = mean > 0 ? 1000 / mean : 0;
    }
    this._lastFrameAt = now;
  }

  /** Measure a module tick pass. */
  measureTick(ms) {
    this._moduleTickAccum += ms;
    this._samples++;
    this.moduleTickMs = this._moduleTickAccum / Math.max(1, this._samples);
  }

  measureRender(ms) {
    this._moduleRenderAccum += ms;
    // Exponentially weighted so a single spike does not dominate.
    this.moduleRenderMs = this.moduleRenderMs * 0.9 + ms * 0.1;
  }

  /** @returns {number} seconds since client start */
  upSeconds() {
    return (Date.now() - this.startTime) / 1000;
  }

  /** Memory info when the browser exposes it; -1 otherwise. */
  memoryUsedMB() {
    const m = globalThis.performance?.memory;
    if (!m || typeof m.usedJSHeapSize !== "number") return -1;
    return m.usedJSHeapSize / (1024 * 1024);
  }

  memoryLimitMB() {
    const m = globalThis.performance?.memory;
    if (!m || typeof m.jsHeapSizeLimit !== "number") return -1;
    return m.jsHeapSizeLimit / (1024 * 1024);
  }

  /** Reset the worst-frame watermark (the monitor calls this per second). */
  resetWorst() {
    this.worstFrameMs = 0;
  }

  snapshot() {
    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      worstFrameMs: this.worstFrameMs,
      moduleTickMs: this.moduleTickMs,
      moduleRenderMs: this.moduleRenderMs,
      memoryUsedMB: this.memoryUsedMB(),
      memoryLimitMB: this.memoryLimitMB(),
      upSeconds: this.upSeconds(),
    };
  }
}

/**
 * Fixed-timestep ticker driven by requestAnimationFrame.
 *
 * The game already ticks; this exists so framework-level modules (AutoClicker's
 * timing, Timers, session stats) get a stable clock even when the game is in a
 * menu and not ticking. It never assumes 60 Hz.
 */
export class Ticker {
  constructor({ hz = 20, onTick, onFrame } = {}) {
    this.hz = hz;
    this.intervalMs = 1000 / hz;
    this.onTick = onTick;
    this.onFrame = onFrame;
    this._raf = null;
    this._lastTick = 0;
    this._running = false;
    this._rafFn = null;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTick = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      this.onFrame?.(now);
      const elapsed = now - this._lastTick;
      if (elapsed >= this.intervalMs) {
        // Cap the catch-up ticks so a backgrounded tab does not cause a burst
        // of simulation when it regains focus.
        const ticks = Math.min(5, Math.floor(elapsed / this.intervalMs));
        this._lastTick += ticks * this.intervalMs;
        try {
          this.onTick?.(ticks);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[meteor] ticker callback threw", err);
        }
      }
      this._raf = requestAnimationFrame(loop);
    };
    this._rafFn = loop;
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._raf !== null && this._raf !== undefined) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  get running() {
    return this._running;
  }
}
