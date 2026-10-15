/** Eaglercraft-specific entry point for the real standalone HTML. */
import { bootMeteor, shutdownMeteor, Events, createAllModules } from '../index.js';
import { EaglercraftBrowserAdapter } from './eaglercraft-adapter.js';

let runtime = null;

function createEaglercraftModules() {
  const modules = createAllModules();
  // These two modules operate purely through browser input injection on the
  // standalone build. Do not advertise `movement`: direct player physics are
  // still unavailable, and doing so would incorrectly arm Flight/Speed/etc.
  for (const id of ['auto-clicker', 'auto-walk']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['input'];
  }
  return modules;
}

export function startEaglerHacks({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  if (runtime) return runtime;
  if (!doc?.body || !doc.getElementById?.('game_frame')) {
    throw new Error('Eaglercraft 26.2-u1 #game_frame is missing');
  }
  const adapter = new EaglercraftBrowserAdapter({ window: win, document: doc });
  adapter.mount();
  const client = bootMeteor({ adapter, modules: createEaglercraftModules() });

  let running = true;
  let raf = null;
  const frame = (now) => {
    if (!running) return;
    try { adapter.renderHud(client.bus, Events, now); }
    catch (error) { console.error('[eaghacks] HUD render failed', error); }
    raf = win.requestAnimationFrame(frame);
  };
  raf = win.requestAnimationFrame(frame);

  // screenChanged is an official Eaglercraft launch hook installed preboot by
  // the injector. Revalidate immediately when moving between menus/gameplay so
  // a module cannot keep injecting input after a GUI opens.
  const onScreenChanged = () => {
    client.modules.revalidateAll({ silent: true });
    if (client.clickgui?.open) client.clickgui.refreshAll?.();
  };
  win.addEventListener?.('eaghacks:screenChanged', onScreenChanged);

  const shutdown = () => {
    if (!running) return;
    running = false;
    if (raf !== null) win.cancelAnimationFrame?.(raf);
    win.removeEventListener?.('pagehide', shutdown);
    win.removeEventListener?.('eaghacks:screenChanged', onScreenChanged);
    shutdownMeteor();
    adapter.dispose();
    runtime = null;
    if (win.EaglerHacks?.shutdown === shutdown) delete win.EaglerHacks;
  };

  runtime = {
    client,
    adapter,
    shutdown,
    diagnostics: () => ({ ...client.diagnostics(), eaglercraft: adapter.diagnostics() }),
  };
  win.EaglerHacks = runtime;
  win.addEventListener?.('pagehide', shutdown);
  console.info('[eaghacks] Meteor framework loaded; screen hook + browser input integration active');
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
