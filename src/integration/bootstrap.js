/** Eaglercraft-specific entry point for the real standalone HTML. */
import { bootMeteor, shutdownMeteor, Events } from '../index.js';
import { EaglercraftBrowserAdapter } from './eaglercraft-adapter.js';

let runtime = null;

export function startEaglerHacks({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  if (runtime) return runtime;
  if (!doc?.body || !doc.getElementById?.('game_frame')) {
    throw new Error('Eaglercraft 26.2-u1 #game_frame is missing');
  }
  const adapter = new EaglercraftBrowserAdapter({ window: win, document: doc });
  adapter.mount();
  const client = bootMeteor({ adapter });
  let running = true;
  let raf = null;
  const frame = (now) => {
    if (!running) return;
    try { adapter.renderHud(client.bus, Events, now); }
    catch (error) { console.error('[eaghacks] HUD render failed', error); }
    raf = win.requestAnimationFrame(frame);
  };
  raf = win.requestAnimationFrame(frame);
  const shutdown = () => {
    if (!running) return;
    running = false;
    if (raf !== null) win.cancelAnimationFrame?.(raf);
    win.removeEventListener?.('pagehide', shutdown);
    shutdownMeteor();
    adapter.dispose();
    runtime = null;
    if (win.EaglerHacks?.shutdown === shutdown) delete win.EaglerHacks;
  };
  runtime = { client, adapter, shutdown, diagnostics: () => ({ ...client.diagnostics(), eaglercraft: adapter.diagnostics() }) };
  win.EaglerHacks = runtime;
  win.addEventListener?.('pagehide', shutdown);
  console.info('[eaghacks] Meteor framework loaded; world/gameplay modules remain gated until native hooks are available');
  return runtime;
}

function autostart() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const run = () => {
    try { startEaglerHacks(); }
    catch (error) { console.error('[eaghacks] bootstrap failed', error); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}
autostart();
