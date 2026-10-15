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
  return { dom, adapter, calls };
}

test('adapter never fabricates player/world access from shell readiness', () => {
  const { dom, adapter } = setup();
  adapter.mount();
  dom.window.__eaglerGameReady = true;
  dom.window.__tv = { instance: { exports: { main() {}, 'teavm.memory': {} } } };
  adapter.update();
  assert.equal(adapter.ready, true);
  assert.equal(adapter.inWorld(), false);
  assert.equal(adapter.getPlayer(), null);
  assert.equal(adapter.getWorld(), null);
  assert.equal(adapter.hasCapability('world'), false);
  assert.equal(adapter.hasCapability('entities'), false);
  assert.equal(adapter.hasCapability('movement'), false);
  assert.equal(adapter.isRemote(), true);
  assert.deepEqual(adapter.diagnostics().wasmExports, ['main', 'teavm.memory']);
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
