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

  // These modules can be driven through the browser input bridge. Do not
  // advertise `movement`: direct player physics/state still are not exported by
  // the TeaVM build, and doing so would incorrectly arm Flight/Speed/etc.
  for (const id of ['auto-clicker', 'auto-walk', 'sprint']) {
    const module = modules.find((m) => m.id === id);
    if (module) {
      module.requiredCapabilities = ['input'];
      // ClickGUI intentionally releases pointer lock. Keep these modules
      // configurable while the GUI is open; adapter actions themselves still
      // refuse to inject input until gameplay owns the real game canvas again.
      module.runsInMenus = true;
    }
  }

  // Browser-backed Sprint cannot inspect hunger/moveForward because player
  // state is not exported by this TeaVM build. Preserve the visible settings,
  // but hold the default sprint key only while W is physically held, or
  // continuously when "only-forward" is disabled.
  const sprint = modules.find((m) => m.id === 'sprint');
  if (sprint) {
    sprint.onTick = function () {
      const onlyForward = this.settings.get('only-forward')?.value !== false;
      const held = this.manager.client?.keybinds?.heldKeys;
      const shouldSprint = !onlyForward || !!held?.has('KeyW');
      this.game.setSprinting?.(shouldSprint);
    };
    sprint.onDisable = function () {
      this.game.setSprinting?.(false);
    };
  }

  // AutoClicker already inherits localTestOnly from CombatModule. AutoWalk is
  // also automated gameplay input, so apply the same remote-session safeguard.
  // Its stock onEnable immediately presses W; that cannot succeed while the
  // ClickGUI still owns input. Defer the first keydown to onTick, after the GUI
  // closes and the game has reacquired pointer lock.
  const autoWalk = modules.find((m) => m.id === 'auto-walk');
  if (autoWalk) {
    autoWalk.localTestOnly = true;
    autoWalk.onEnable = () => {};
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
  const client = bootMeteor({
    adapter,
    modules: createEaglercraftModules(),
    storage: resolveEaglerStorage(win),
  });

  let running = true;
  let raf = null;
  let lastInWorld = adapter.inWorld();
  const frame = (now) => {
    if (!running) return;
    try {
      adapter.renderHud(client.bus, Events, now);
      const nowInWorld = adapter.inWorld();
      if (nowInWorld !== lastInWorld) {
        lastInWorld = nowInWorld;
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
    diagnostics: () => ({
      ...client.diagnostics(),
      multiplayerAutomationAllowed: client.allowMultiplayerCombat,
      eaglercraft: adapter.diagnostics(),
    }),
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
