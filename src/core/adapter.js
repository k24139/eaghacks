/**
 * GameAdapter — the single integration seam between this framework and the
 * Eaglercraft runtime.
 *
 * Why this exists: Meteor Client talks to Minecraft via Fabric mixins and named
 * classes. Eaglercraft ships as TeaVM-compiled JavaScript + WASM, so there is no
 * stable Java API to bind to. Rather than scattering `window.some_obfuscated_x`
 * lookups through every module, every game touch goes through one object. When
 * the real client HTML is available, only this file (plus a thin binding) needs
 * to change; modules stay untouched.
 *
 * Capability model: each adapter advertises a set of capability keys. A module
 * declares `requiredCapabilities`, and the manager refuses to enable it when a
 * capability is missing. That is how "unsupported on this runtime" is expressed
 * honestly instead of shipping a toggle that silently does nothing.
 *
 * Capability keys:
 *   world       a world/dimension is loaded and readable
 *   entities    entity list is readable
 *   blocks      block access / raycast is available
 *   inventory   inventory contents + hotbar selection are readable
 *   movement    player position/velocity are writable (movement modules)
 *   flight      flight toggling is supported
 *   render      ability to inject world-space rendering
 *   hud         ability to draw 2D overlay onto the game canvas
 *   input       keyboard/mouse input can be observed and injected
 *   network     connection state + packet observation is available
 *   chat        chat send/receive is available
 *   timing      local game tick rate is adjustable (Timer)
 */

export const CAPABILITIES = Object.freeze([
  "world",
  "entities",
  "blocks",
  "inventory",
  "movement",
  "flight",
  "render",
  "hud",
  "input",
  "network",
  "chat",
  "timing",
]);

export class GameAdapter {
  constructor() {
    /** @type {Set<string>} */
    this.capabilities = new Set();
    /** @type {string} */
    this.runtimeName = "unknown";
  }

  hasCapability(name) {
    return this.capabilities.has(name);
  }

  /** @returns {boolean} true when a playable world is loaded */
  inWorld() {
    return false;
  }

  /** Called by the host on every client tick. */
  update() {}

  // -- accessors (return null/[] when unavailable, never throw) -------------
  getPlayer() {
    return null;
  }
  getWorld() {
    return null;
  }
  getEntities() {
    return [];
  }
  getCrosshairTargetEntity() {
    return null;
  }
  getCrosshairTargetBlock() {
    return null;
  }
  getInventory() {
    return null;
  }
  getSelectedSlot() {
    return -1;
  }
  getFps() {
    return 0;
  }
  getFrameTimeMs() {
    return 0;
  }
  getPing() {
    return -1;
  }
  getSessionSeconds() {
    return 0;
  }
  getCanvas() {
    return null;
  }

  // -- actions (no-ops unless the capability exists) ------------------------
  attack(_entity) {
    return false;
  }
  useItem(_hand) {
    return false;
  }
  selectSlot(_index) {
    return false;
  }
  setSprinting(_on) {
    return false;
  }
  setSneaking(_on) {
    return false;
  }
  setFlying(_on) {
    return false;
  }
  setStepHeight(_blocks) {
    return false;
  }
  setJumpHeight(_blocks) {
    return false;
  }
  setSafeWalk(_on) {
    return false;
  }
  setNoFall(_on) {
    return false;
  }
  setClimbSpeed(_multiplier) {
    return false;
  }
  setForward(_on) {
    return false;
  }
  jump() {
    return false;
  }
  isOnGround() {
    return false;
  }
  getPlayerVelocity() {
    return null;
  }
  setPlayerVelocity(_vx, _vy, _vz) {
    return false;
  }
  getBrightness() {
    return null;
  }
  getFov() {
    return null;
  }
  setHurtCam(_on) {
    return false;
  }
  /** @returns {Array<{x:number,y:number,z:number}>|null} */
  findBlocks(_names, _radius) {
    return null;
  }
  setFov(_degrees) {
    return false;
  }
  setBrightness(_value) {
    return false;
  }
  sendChat(_message) {
    return false;
  }
  /** Local tick-rate multiplier for the Timer module. Returns applied value. */
  setTickRate(_multiplier) {
    return false;
  }
  /** Release/acquire pointer lock through the game's own mechanism. */
  setPointerLock(_locked) {
    return false;
  }
}

/** Adapter used when the game is absent: every capability is off. */
export class NullAdapter extends GameAdapter {
  constructor(reason = "no game runtime bound") {
    super();
    this.runtimeName = "null";
    this.reason = reason;
  }
}

/**
 * Test double. Only used by the automated test-suite to exercise modules that
 * need a world; it is not shipped as a game.
 */
export class MockAdapter extends GameAdapter {
  constructor() {
    super();
    this.runtimeName = "mock";
    this.capabilities = new Set(CAPABILITIES);
    this._inWorld = false;
    this.player = { x: 0, y: 64, z: 0, yaw: 0, pitch: 0, health: 20, maxHealth: 20, hunger: 20, name: "TestPlayer" };
    this.world = { time: 6000, dimension: "overworld", biome: "plains" };
    this.entities = [];
    this.calls = [];
    this.actionLog = [];
    this._fps = 60;
  }
  inWorld() {
    return this._inWorld;
  }
  setWorldLoaded(v) {
    this._inWorld = v;
  }
  getPlayer() {
    return this._inWorld ? this.player : null;
  }
  getWorld() {
    return this._inWorld ? this.world : null;
  }
  getEntities() {
    return this._inWorld ? this.entities : [];
  }
  getFps() {
    return this._fps;
  }
  setCanvas(c) {
    this._canvas = c;
  }
  getCanvas() {
    return this._canvas ?? null;
  }
  getInventory() {
    return { hotbar: [], armor: [] };
  }
  getPing() {
    return 20;
  }
  getSessionSeconds() {
    return 0;
  }
  isRemote() {
    return !!this._remote;
  }
  setRemote(v) {
    this._remote = !!v;
  }
  isOnGround() {
    return true;
  }
  _log(action, extra = {}) {
    this.actionLog.push({ action, ...extra });
    return true;
  }
  attack(e) {
    return this._log("attack", { target: e?.name ?? null });
  }
  useItem() {
    return this._log("use-item");
  }
  selectSlot(i) {
    this._selectedSlot = i;
    return this._log("select-slot", { slot: i });
  }
  getSelectedSlot() {
    return this._selectedSlot ?? 0;
  }
  setSprinting(on) {
    this.player.sprinting = on;
    return this._log("sprint", { value: on });
  }
  setSneaking(on) {
    return this._log("sneak", { value: on });
  }
  setFlying(on) {
    this.player.flying = on;
    return this._log("flying", { value: on });
  }
  setStepHeight(v) {
    this.stepHeight = v;
    return this._log("step-height", { value: v });
  }
  getStepHeight() {
    return this.stepHeight ?? 0.6;
  }
  setJumpHeight(v) {
    this.jumpHeight = v;
    return this._log("jump-height", { value: v });
  }
  getJumpHeight() {
    return this.jumpHeight ?? 1;
  }
  setSafeWalk(on) {
    return this._log("safe-walk", { value: on });
  }
  setNoFall(on) {
    return this._log("no-fall", { value: on });
  }
  setForward(on) {
    return this._log("forward", { value: on });
  }
  jump() {
    return this._log("jump");
  }
  getPlayerVelocity() {
    return { x: 0.1, y: 0, z: 0.1 };
  }
  setPlayerVelocity(vx, vy, vz) {
    this.velocity = { vx, vy, vz };
    return this._log("velocity", { vx, vy, vz });
  }
  getFov() {
    return this.fov ?? 70;
  }
  setFov(v) {
    this.fov = v;
    return this._log("fov", { value: v });
  }
  getBrightness() {
    return this.brightness ?? 0;
  }
  setBrightness(v) {
    this.brightness = v;
    return this._log("brightness", { value: v });
  }
  setHurtCam(on) {
    return this._log("hurt-cam", { value: on });
  }
  setTickRate(v) {
    this.tickRate = v;
    return this._log("tick-rate", { value: v });
  }
  sendChat(msg) {
    return this._log("chat", { message: msg });
  }
  findBlocks(names, radius) {
    // Deterministic fake blocks so block-based modules can be exercised.
    return names.map((name, i) => ({ name, x: i + 1, y: 64, z: i + 1, radius }));
  }
  getWorldKey() {
    return this.worldKey ?? "mock-world";
  }
  setPointerLock(v) {
    this.pointerLock = v;
    return true;
  }
  setRotation(yaw, pitch) {
    this.player.yaw = yaw;
    this.player.pitch = pitch;
    return this._log("rotation", { yaw, pitch });
  }
  worldToScreen(x, y, z) {
    // Cheap orthographic projection, enough to exercise render paths.
    return { x: 400 + x * 10, y: 300 - y * 10, visible: z >= 0, behind: z < 0 };
  }
  getViewport() {
    return { width: 800, height: 600 };
  }
}
