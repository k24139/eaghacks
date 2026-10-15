import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureDom } from './helpers.mjs';

ensureDom();
const { Module } = await import('../src/core/module.js');
const { ModuleManager } = await import('../src/core/module-manager.js');
const { EventBus } = await import('../src/core/event-bus.js');
const { MockAdapter } = await import('../src/core/adapter.js');

function setup(remote, allow = false) {
  const adapter = new MockAdapter();
  adapter.setWorldLoaded(true);
  adapter.setRemote(remote);
  const manager = new ModuleManager({ bus: new EventBus(), game: adapter });
  manager.client = { allowMultiplayerCombat: allow };
  const module = new Module({
    id: 'local-only',
    name: 'Local Only',
    category: 'Combat',
    localTestOnly: true,
  });
  manager.register(module);
  return { adapter, manager, module };
}

test('local-test-only modules are allowed in singleplayer/local sessions', () => {
  const { module } = setup(false, false);
  assert.equal(module.canEnable(), true);
  module.enable();
  assert.equal(module.active, true);
});

test('local-test-only modules are blocked on remote sessions by default', () => {
  const { module } = setup(true, false);
  assert.equal(module.canEnable(), false);
  assert.match(module.ineligibilityReason(), /remote sessions/);
  module.enable();
  assert.equal(module.active, false);
});

test('remote guard can be explicitly overridden by the client setting', () => {
  const { module } = setup(true, true);
  assert.equal(module.canEnable(), true);
  module.enable();
  assert.equal(module.active, true);
});
