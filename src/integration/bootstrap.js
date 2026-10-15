/** Eaglercraft-specific entry point for the real standalone HTML. */
import { bootMeteor, shutdownMeteor, Events, createAllModules } from '../index.js';
import { EaglercraftBrowserAdapter } from './eaglercraft-adapter.js';

let runtime = null;

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(key) { return map.has(String(key)) ? map.get(String(key)) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(String(key)); },
    clear() { map.clear(); },
  };
}

/**
 * Accessing window.localStorage can itself throw a SecurityError on opaque or
 * sandboxed origins, before ConfigManager gets a chance to probe the Storage
 * object. Resolve and probe it here, then pass an explicit Storage-like object
 * to bootMeteor so those environments degrade to in-memory config instead of
 * aborting the whole client bootstrap.
 */
export function resolveEaglerStorage(win = globalThis.window) {
  try {
    const storage = win?.localStorage;
    if (!storage) return createMemoryStorage();
    const probe = '__eaghacks_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch (error) {
    console.warn('[eaghacks] persistent storage unavailable; using in-memory configuration', error);
    return createMemoryStorage();
  }
}

function createEaglercraftModules() {
  const modules = createAllModules();
  // These two modules operate purely through browser input injection on the
  // standalone build. Do not advertise `movement`: direct player physics are
  // still unavailable, and doing so would incorrectly arm Flight/Speed/etc.
  for (const id of ['auto-clicker', 'auto-walk']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['input'];
  }
  // AutoClicker already inherits localTestOnly from CombatModule. AutoWalk is
  // also automated gameplay input, so apply the same remote-session safeguard.
  const autoWalk = modules.find((m) => m.id === 'auto-walk');
  if (autoWalk) autoWalk.localTestOnly = true;
  return modules;
}

export function startEaglerHacks({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  if (runtime) return runtime;
  if (!doc?.body || !doc.getElementById?.('game_frame')) {
    throw new Error('Eaglercraft 26.2-u1 #game_frame is missing');
  }
  const adapter = new EaglercraftBrowserAdapter({ window: win, document: doc });
  adapter.mount();
  const client = bootMeteor({
    adapter,
    modules: createEaglercraftModules(),
    storage: resolveEaglerStorage(win),
  });

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

  const setMultiplayerAutomation = (enabled) => {
    client.allowMultiplayerCombat = !!enabled;
    if (!client.allowMultiplayerCombat) client.modules.revalidateAll({ silent: true });
    if (client.clickgui?.open) client.clickgui.refreshAll?.();
    return client.allowMultiplayerCombat;
  };

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
    allowMultiplayerCombat: setMultiplayerAutomation,
    diagnostics: () => ({
      ...client.diagnostics(),
      multiplayerAutomationAllowed: client.allowMultiplayerCombat,
      eaglercraft: adapter.diagnostics(),
    }),
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
