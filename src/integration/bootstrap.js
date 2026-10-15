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
  for (const id of ['auto-clicker', 'auto-walk', 'sprint']) {
    const module = modules.find((m) => m.id === id);
    if (module) {
      module.requiredCapabilities = ['input'];
      module.runsInMenus = true;
    }
  }

  const sprint = modules.find((m) => m.id === 'sprint');
  if (sprint) {
    sprint.onTick = function () {
      const onlyForward = this.settings.get('only-forward')?.value !== false;
      const held = this.manager.client?.keybinds?.heldKeys;
      this.game.setSprinting?.(!onlyForward || !!held?.has('KeyW'));
    };
    sprint.onDisable = function () { this.game.setSprinting?.(false); };
  }

  // Real world reads do not imply every renderer/camera action is writable.
  for (const [id, capability] of [
    ['fullbright', 'brightness-control'],
    ['zoom', 'fov-control'],
    ['no-hurt-cam', 'hurt-camera-control'],
  ]) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['world', capability];
  }

  // Read-only item metadata + verified selected-slot/use-item actions satisfy
  // these modules without enabling the broad inventory mutation contract.
  for (const id of ['armor-hud', 'durability-warnings']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['native-inventory-read'];
  }
  const autoEat = modules.find((m) => m.id === 'auto-eat');
  if (autoEat) autoEat.requiredCapabilities = ['world', 'native-inventory-read', 'native-direct'];

  // Source-built 26.2 clients expose real entity state and direct actions.
  for (const id of ['kill-aura', 'aim-assist', 'trigger-bot', 'auto-crit']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['world', 'entities', 'native-direct'];
  }

  const autoWalk = modules.find((m) => m.id === 'auto-walk');
  if (autoWalk) {
    autoWalk.localTestOnly = true;
    autoWalk.onEnable = () => {};
  }
  return modules;
}

export function startEaglerHacks({ window: win = globalThis.window, document: doc = globalThis.document } = {}) {
  if (runtime) return runtime;
  if (!doc?.body || !doc.getElementById?.('game_frame')) throw new Error('Eaglercraft 26.2-u1 #game_frame is missing');
  const adapter = new EaglercraftBrowserAdapter({ window: win, document: doc });
  adapter.mount();
  const client = bootMeteor({ adapter, modules: createEaglercraftModules(), storage: resolveEaglerStorage(win) });

  let running = true;
  let raf = null;
  let lastInWorld = adapter.inWorld();
  let lastCapabilities = [...adapter.capabilities].sort().join('|');
  const frame = (now) => {
    if (!running) return;
    try {
      adapter.renderHud(client.bus, Events, now);
      const nowInWorld = adapter.inWorld();
      const capabilitySignature = [...adapter.capabilities].sort().join('|');
      if (nowInWorld !== lastInWorld || capabilitySignature !== lastCapabilities) {
        lastInWorld = nowInWorld;
        lastCapabilities = capabilitySignature;
        client.modules.revalidateAll({ silent: true });
        client.hud.sync();
        if (client.clickgui?.open) client.clickgui.refreshAll?.();
      }
    } catch (error) {
      console.error('[eaghacks] frame integration failed', error);
    }
    raf = win.requestAnimationFrame(frame);
  };
  raf = win.requestAnimationFrame(frame);

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
    diagnostics: () => ({ ...client.diagnostics(), multiplayerAutomationAllowed: client.allowMultiplayerCombat, eaglercraft: adapter.diagnostics() }),
  };
  win.EaglerHacks = runtime;
  win.addEventListener?.('pagehide', shutdown);
  console.info('[eaghacks] Meteor framework loaded; browser integration active');
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
