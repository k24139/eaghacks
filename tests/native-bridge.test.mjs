import test from 'node:test';
import assert from 'node:assert/strict';
import { EaglercraftBrowserAdapter } from '../src/integration/eaglercraft-adapter.js';

function setup() {
  const win = { addEventListener() {}, __eaglerGameReady: true, __eaglerWorldReady: true, minecraftServer: 'singleplayer', __eaghacksScreenHookSeen: true, __eaghacksScreenState: { screenName: null } };
  const doc = { pointerLockElement: null, getElementById() { return null; }, querySelector() { return null; } };
  return { win, adapter: new EaglercraftBrowserAdapter({ window: win, document: doc }) };
}

function installState(win) {
  win.__eaghacksNativeState = {
    version: 1,
    tick: 42,
    world: { time: 6000, dimension: 'minecraft:overworld', biome: null },
    player: { x: 1, y: 64, z: 2, yaw: 90, pitch: -5, health: 18, maxHealth: 20, hunger: 17, onGround: true, name: 'Player', velocity: { x: 0.1, y: 0, z: -0.2 } },
    camera: { x: 0, y: 0, z: 0, m: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    entities: [
      { id: 7, name: 'Player', x: 1, y: 64, z: 2, isSelf: true, isPlayer: true, visible: true },
      { id: 9, name: 'Zombie', x: 3, y: 64, z: 2, isSelf: false, hostile: true, visible: true },
    ],
    inventory: {
      selectedSlot: 4,
      hotbar: [
        { slot: 0, id: 'minecraft:bread', name: 'Bread', count: 4, durability: -1, maxDurability: 0, food: true, nutrition: 5, saturation: 6 },
        null, null, null,
        { slot: 4, id: 'minecraft:diamond_pickaxe', name: 'Diamond Pickaxe', count: 1, durability: 1200, maxDurability: 1561, food: false, nutrition: 0, saturation: 0 },
      ],
      armor: [{ slot: 0, id: 'minecraft:diamond_boots', name: 'Diamond Boots', count: 1, durability: 300, maxDurability: 429, food: false, nutrition: 0, saturation: 0 }],
    },
    crosshairEntityId: 9,
    features: { directMovement: true, combat: true, render: true, inventoryRead: true },
  };
}

test('native snapshot adds only verified capabilities and exposes real state', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.hasCapability('world'), true);
  assert.equal(adapter.hasCapability('entities'), true);
  assert.equal(adapter.hasCapability('native-direct'), true);
  assert.equal(adapter.hasCapability('render'), true);
  assert.equal(adapter.hasCapability('native-inventory-read'), true);
  assert.equal(adapter.hasCapability('movement'), false);
  assert.equal(adapter.hasCapability('inventory'), false, 'read metadata does not imply full inventory mutation support');
  assert.deepEqual(adapter.getPlayer(), win.__eaghacksNativeState.player);
  assert.deepEqual(adapter.getWorld(), win.__eaghacksNativeState.world);
  assert.equal(adapter.getCrosshairTargetEntity()?.id, 9);
  assert.equal(adapter.isOnGround(), true);
  assert.deepEqual(adapter.getPlayerVelocity(), { x: 0.1, y: 0, z: -0.2 });
});

test('native actions are queued atomically for the Java tick bridge', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.setRotation(12.5, -7, 0.5), true);
  assert.equal(adapter.setPlayerVelocity(1, 2, 3), true);
  assert.equal(adapter.setSprinting(true), true);
  assert.equal(adapter.setSneaking(false), true);
  assert.equal(adapter.jump(), true);
  assert.equal(adapter.attack({ id: 9 }), true);
  assert.equal(adapter.useItem('offhand'), true);
  assert.deepEqual(win.__eaghacksNativeCommands, {
    rotation: { yaw: 51.25, pitch: -6 }, velocity: { x: 1, y: 2, z: 3 },
    sprinting: true, sneaking: false, jump: true, attackEntityId: 9, useItem: 'offhand',
  });
});

test('native capabilities disappear cleanly when the bridge snapshot disappears', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  delete win.__eaghacksNativeState; adapter.update();
  assert.equal(adapter.hasCapability('world'), false);
  assert.equal(adapter.hasCapability('entities'), false);
  assert.equal(adapter.hasCapability('native-direct'), false);
  assert.equal(adapter.hasCapability('render'), false);
  assert.equal(adapter.hasCapability('native-inventory-read'), false);
  assert.equal(adapter.hasCapability('input'), true);
});

test('native camera matrix projects world coordinates into the overlay viewport', () => {
  const { win, adapter } = setup(); win.innerWidth = 800; win.innerHeight = 600; installState(win); adapter.update();
  assert.deepEqual(adapter.worldToScreen(0, 0, 0), { x: 400, y: 300, depth: 0, behind: false, visible: true });
  const topRight = adapter.worldToScreen(1, 1, 0);
  assert.equal(topRight.x, 800); assert.equal(topRight.y, 0); assert.equal(topRight.visible, true);
  assert.equal(adapter.projectEntityCentered({ x: 0, y: 0, z: 0, height: 2 }).y, 0);
});

test('native inventory helpers expose held durability and food selection without broad inventory capability', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.getHeldItem()?.id, 'minecraft:diamond_pickaxe');
  assert.equal(adapter.getHeldItem()?.durability, 1200);
  assert.equal(adapter.findFoodInHotbar('bread'), 0);
  assert.equal(adapter.findFoodInHotbar('auto'), 0);
  assert.equal(adapter.findFoodInHotbar('cooked_beef'), -1);
  assert.equal(adapter.hasCapability('inventory'), false);
});

test('native commands stop in menus and pending commands do not cross sessions', () => {
  const { win, adapter } = setup(); installState(win); adapter.update();
  assert.equal(adapter.attack({ id: 9 }), true);
  win.__eaghacksScreenState.screenName = 'PauseScreen';
  assert.equal(adapter.jump(), false);
  assert.equal(adapter.selectSlot(2), false);
  assert.equal(adapter.setRotation(5, 10), false);
  assert.equal(adapter.setPlayerVelocity(1, 2, 3), false);
  assert.equal(adapter.useItem(), false);
  assert.equal(adapter.setSprinting(false), true, 'cleanup remains possible');
  adapter.update();
  assert.equal(win.__eaghacksNativeCommands, undefined);
  win.__eaghacksScreenState.screenName = null;
  win.__eaglerWorldReady = false;
  assert.equal(adapter.attack({ id: 9 }), false);
});
