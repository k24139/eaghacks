import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { EaglercraftBrowserAdapter } from '../src/integration/eaglercraft-adapter.js';

function setup() {
  const dom = new JSDOM('<!doctype html><body><div id="game_frame"><canvas id="game"></canvas></div></body>');
  const calls = [];
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return { setTransform: (...a) => calls.push(['transform', ...a]), clearRect: (...a) => calls.push(['clear', ...a]) };
  };
  Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 800 });
  Object.defineProperty(dom.window, 'innerHeight', { configurable: true, value: 600 });
  Object.defineProperty(dom.window, 'devicePixelRatio', { configurable: true, value: 2 });
  const adapter = new EaglercraftBrowserAdapter({ window: dom.window, document: dom.window.document });
  return { dom, adapter, calls, game: dom.window.document.querySelector('#game') };
}

function setPointerLock(dom, target) {
  Object.defineProperty(dom.window.document, 'pointerLockElement', { configurable: true, value: target });
}

function setScreen(dom, screenName) {
  dom.window.__eaglerGameReady = true;
  dom.window.minecraftServer = 'singleplayer';
  dom.window.__eaghacksScreenHookSeen = true;
  dom.window.__eaghacksScreenState = {
    screenName,
    scaledWidth: 800,
    scaledHeight: 600,
    realWidth: 800,
    realHeight: 600,
    scaleFactor: 1,
  };
}

test('adapter never fabricates player/world access from shell readiness', () => {
  const { dom, adapter } = setup();
  adapter.mount();
  dom.window.__eaglerGameReady = true;
  dom.window.__tv = { instance: { exports: { main() {}, 'teavm.memory': {} } } };
  adapter.update();
  assert.equal(adapter.ready, true);
  assert.equal(adapter.inWorld(), false, 'game-ready alone is not enough; minecraftServer is still null');
  assert.equal(adapter.getPlayer(), null);
  assert.equal(adapter.getWorld(), null);
  assert.equal(adapter.hasCapability('world'), false);
  assert.equal(adapter.hasCapability('entities'), false);
  assert.equal(adapter.hasCapability('movement'), false);
  assert.equal(adapter.hasCapability('input'), true);
  assert.equal(adapter.isRemote(), true);
  assert.deepEqual(adapter.diagnostics().wasmExports, ['main', 'teavm.memory']);
  dom.window.close();
});

test('official screenChanged state refines menu vs active gameplay when the hook fires', () => {
  const { dom, adapter } = setup();
  adapter.mount();
  setScreen(dom, 'net.minecraft.client.gui.screens.TitleScreen');
  assert.equal(adapter.inWorld(), false);
  setScreen(dom, null);
  assert.equal(adapter.inWorld(), true);
  setScreen(dom, 'net.minecraft.client.gui.screens.PauseScreen');
  assert.equal(adapter.inWorld(), false);
  adapter.dispose();
  dom.window.close();
});

test('26.2 minecraftServer fallback detects a loaded session without screenChanged', () => {
  const { dom, adapter, game } = setup();
  adapter.mount();
  dom.window.__eaglerGameReady = true;
  dom.window.minecraftServer = 'singleplayer';
  assert.equal(adapter.inWorld(), true);
  assert.equal(adapter.diagnostics().gameplayInputAllowed, false, 'no pointer lock means a menu may own controls');
  setPointerLock(dom, game);
  assert.equal(adapter.diagnostics().gameplayInputAllowed, true);
  dom.window.minecraftServer = null;
  assert.equal(adapter.inWorld(), false);
  adapter.dispose();
  dom.window.close();
});

test('browser input adapter injects the same KeyboardEvent/MouseEvent shape used by Eaglercraft self-test', () => {
  const { dom, adapter, game } = setup();
  adapter.mount();
  setScreen(dom, null);
  setPointerLock(dom, game);
  const events = [];
  for (const type of ['keydown', 'keyup', 'mousedown', 'mouseup']) {
    game.addEventListener(type, (event) => events.push({ type, code: event.code, key: event.key, button: event.button }));
  }

  assert.equal(adapter.setForward(true), true);
  assert.equal(adapter.setForward(true), true, 'duplicate held state must not send another keydown');
  assert.equal(adapter.setForward(false), true);
  assert.equal(adapter.setSprinting(true), true);
  assert.equal(adapter.setSprinting(false), true);
  assert.equal(adapter.jump(), true);
  assert.equal(adapter.attack(null), true);
  assert.equal(adapter.useItem(), true);

  assert.deepEqual(events.slice(0, 6), [
    { type: 'keydown', code: 'KeyW', key: 'w', button: undefined },
    { type: 'keyup', code: 'KeyW', key: 'w', button: undefined },
    { type: 'keydown', code: 'ControlLeft', key: 'Control', button: undefined },
    { type: 'keyup', code: 'ControlLeft', key: 'Control', button: undefined },
    { type: 'keydown', code: 'Space', key: ' ', button: undefined },
    { type: 'keyup', code: 'Space', key: ' ', button: undefined },
  ]);
  assert.deepEqual(events.filter((e) => e.type.startsWith('mouse')).map((e) => [e.type, e.button]), [
    ['mousedown', 0], ['mouseup', 0], ['mousedown', 2], ['mouseup', 2],
  ]);

  setScreen(dom, 'net.minecraft.client.gui.screens.PauseScreen');
  const before = events.length;
  assert.equal(adapter.setForward(true), false);
  assert.equal(adapter.attack(null), false);
  assert.equal(events.length, before, 'menu state must suppress new gameplay input');
  adapter.dispose();
  dom.window.close();
});

test('adapter releases held synthetic movement when gameplay loses control', () => {
  const { dom, adapter, game } = setup();
  adapter.mount();
  dom.window.__eaglerGameReady = true;
  dom.window.minecraftServer = 'singleplayer';
  setPointerLock(dom, game);
  const ups = [];
  game.addEventListener('keyup', (event) => ups.push(event.code));
  assert.equal(adapter.setForward(true), true);
  assert.deepEqual(adapter.diagnostics().syntheticHeldKeys, ['KeyW']);
  setPointerLock(dom, null);
  adapter.update();
  assert.deepEqual(adapter.diagnostics().syntheticHeldKeys, []);
  assert.deepEqual(ups, ['KeyW']);
  adapter.dispose();
  dom.window.close();
});

test('browser HUD draws to independent transparent canvas and emits real frame event', () => {
  const { dom, adapter, calls } = setup();
  adapter.mount();
  assert.equal(adapter.hasCapability('hud'), true);
  assert.equal(adapter.getCanvas().width, 1600);
  assert.equal(adapter.getCanvas().height, 1200);
  assert.equal(adapter.getGameCanvas().id, 'game');
  assert.notEqual(adapter.getCanvas(), adapter.getGameCanvas());
  const events = [];
  adapter.renderHud({ emit: (type, value) => events.push({ type, value }) }, { RenderHud: 'render-hud' }, 100);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'render-hud');
  assert.deepEqual(events[0].value.viewport, { width: 800, height: 600 });
  assert.ok(calls.some((x) => x[0] === 'clear'));
  adapter.dispose();
  assert.equal(dom.window.document.querySelector('#eaghacks-hud-canvas'), null);
  assert.equal(adapter.hasCapability('hud'), false);
  dom.window.close();
});

test('mount is idempotent and no pointer lock is attempted without a game canvas', () => {
  const { dom, adapter } = setup();
  adapter.mount().mount();
  assert.equal(dom.window.document.querySelectorAll('#eaghacks-hud-canvas').length, 1);
  dom.window.document.querySelector('#game').remove();
  assert.equal(adapter.setPointerLock(true), false);
  adapter.dispose();
  dom.window.close();
});
