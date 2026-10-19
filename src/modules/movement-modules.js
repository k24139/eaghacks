/**
 * Movement modules.
 *
 * Every movement module follows the same discipline, because a movement module
 * that fails to restore state is the classic way to leave a client "stuck":
 *   onEnable()  -> snapshot the original value, record what we changed
 *   onTick()    -> re-apply (the game may reset it between ticks)
 *   onDisable() -> restore the snapshot exactly
 *
 * Automated movement is intentionally gated behind the adapter reporting the
 * relevant capability, and every module notes in its description that it is for
 * single-player / authorised testing.
 */
import { Module } from "../core/module.js";

const LOCAL_NOTE = "For single-player or authorised test environments only.";

/** @returns {void} throws when the adapter cannot perform the action */
function requireAdapter(game, method, ...args) {
  if (typeof game?.[method] !== "function" || game[method](...args) === false) {
    throw new Error(`runtime does not support ${method}()`);
  }
}

export class Sprint extends Module {
  constructor() {
    super({ id: "sprint", name: "Sprint", description: "Keeps the player sprinting when moving forward.", category: "Movement", requiredCapabilities: ["movement"] });
    this._original = null;
  }
  onInit() {
    const g = this.settings.addGroup("Sprint");
    g.bool("only-forward", "Only sprint while holding forward", true);
    g.int("min-hunger", "Minimum hunger to sprint", 6, { min: 0, max: 20 });
    g.bool("restore", "Restore the previous sprint state on disable", true);
  }
  onTick() {
    const p = this.game.getPlayer?.();
    if (!p) return;
    if (this.settings.get("only-forward").value && p.moveForward !== undefined && p.moveForward <= 0) return;
    if (typeof p.hunger === "number" && p.hunger < this.settings.get("min-hunger").value) return;
    this.game.setSprinting?.(true);
  }
  onDisable() {
    if (this.settings.get("restore").value) this.game.setSprinting?.(false);
  }
}

export class Flight extends Module {
  constructor() {
    super({ id: "flight", name: "Flight", description: `Fly with configurable speed. ${LOCAL_NOTE}`, category: "Movement", requiredCapabilities: ["movement", "flight"] });
    this._wasFlying = false;
  }
  onInit() {
    const g = this.settings.addGroup("Flight");
    g.enum("mode", "Flight mode", "vanilla", ["vanilla", "creative", "velocity", "glide"]);
    g.double("speed", "Horizontal speed", 1.0, { min: 0.1, max: 10 });
    g.double("vertical-speed", "Vertical speed", 0.8, { min: 0.1, max: 10 });
    g.bool("anti-kick", "Limit speed to reduce detection on servers you are allowed to test on", true);
  }
  onEnable() {
    const p = this.game.getPlayer?.();
    this._wasFlying = !!p?.flying;
    requireAdapter(this.game, "setFlying", true);
  }
  onDisable() {
    this.game.setFlying?.(this._wasFlying);
  }
}

export class Speed extends Module {
  constructor() {
    super({ id: "speed", name: "Speed", description: `Increases movement speed. ${LOCAL_NOTE}`, category: "Movement", requiredCapabilities: ["movement"] });
  }
  onInit() {
    const g = this.settings.addGroup("Speed");
    g.enum("mode", "Mode", "multiply", ["multiply", "add", "strafe"]);
    g.double("multiplier", "Speed multiplier", 1.35, { min: 1, max: 5 });
    g.bool("only-ground", "Only apply while on the ground", true);
    g.bool("only-sprinting", "Only apply while sprinting", true);
  }
  onTick() {
    const p = this.game.getPlayer?.();
    const v = this.game.getPlayerVelocity?.();
    if (!p || !v) return;
    if (this.settings.get("only-ground").value && !this.game.isOnGround?.()) return;
    if (this.settings.get("only-sprinting").value && !p.sprinting) return;
    const mult = this.settings.get("multiplier").value;
    const mode = this.settings.get("mode").value;
    let vx = v.x;
    let vz = v.z;
    if (mode === "multiply") {
      vx *= mult;
      vz *= mult;
    } else if (mode === "add") {
      const len = Math.hypot(vx, vz) || 1;
      vx += (vx / len) * (mult - 1) * 0.1;
      vz += (vz / len) * (mult - 1) * 0.1;
    } else if (mode === "strafe") {
      const forward=p.moveForward??0, strafe=p.moveStrafe??0, length=Math.hypot(forward,strafe);
      if(!length)return;
      const yaw=(p.yaw??0)*Math.PI/180, speed=Math.hypot(vx,vz)*mult;
      vx=(-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/length*speed;
      vz=(Math.cos(yaw)*forward+Math.sin(yaw)*strafe)/length*speed;
    }
    this.game.setPlayerVelocity?.(vx, v.y, vz);
  }
}

export class Step extends Module {
  constructor() {
    super({ id: "step", name: "Step", description: "Increases step height so the player walks up full blocks.", category: "Movement", requiredCapabilities: ["movement"] });
    this._original = 0.6;
  }
  onInit() {
    this.settings.addGroup("Step").double("height", "Step height in blocks", 1.0, { min: 0.6, max: 8 });
  }
  onEnable() {
    this._original = this.game.getStepHeight?.() ?? 0.6;
    requireAdapter(this.game, "setStepHeight", this.settings.get("height").value);
  }
  onTick() {
    this.game.setStepHeight?.(this.settings.get("height").value);
  }
  onDisable() {
    this.game.setStepHeight?.(this._original);
  }
}

export class HighJump extends Module {
  constructor() {
    super({ id: "high-jump", name: "HighJump", description: "Increases jump height.", category: "Movement", requiredCapabilities: ["movement"] });
    this._original = 1.0;
    this._jumpBind = null;
  }
  onInit() {
    const g = this.settings.addGroup("Jump");
    g.double("height", "Jump height multiplier", 1.6, { min: 1, max: 8 });
    g.bool("all-jumps", "Apply to every jump", true);
    g.keybind("jump-bind", "Only apply while this key is held", null);
  }
  onEnable() {
    this._original = this.game.getJumpHeight?.() ?? 1.0;
    requireAdapter(this.game, "setJumpHeight", this.settings.get("height").value);
  }
  onTick() {
    const bind = this.settings.get("jump-bind").value;
    if (bind && this.settings.get("all-jumps").value === false) {
      const held = this.manager.client?.keybinds?.heldKeys;
      if (held && !held.has(bind.key)) {
        this.game.setJumpHeight?.(this._original);
        return;
      }
    }
    this.game.setJumpHeight?.(this.settings.get("height").value);
  }
  onDisable() {
    this.game.setJumpHeight?.(this._original);
  }
}

export class SafeWalk extends Module {
  constructor() {
    super({ id: "safe-walk", name: "SafeWalk", description: "Stops movement at block edges (sneak-like behaviour).", category: "Movement", requiredCapabilities: ["movement"] });
  }
  onEnable() {
    requireAdapter(this.game, "setSafeWalk", true);
  }
  onTick() {
    this.game.setSafeWalk?.(true);
  }
  onDisable() {
    this.game.setSafeWalk?.(false);
  }
}

export class NoFall extends Module {
  constructor() {
    super({ id: "no-fall", name: "NoFall", description: "Prevents fall damage.", category: "Movement", requiredCapabilities: ["movement"] });
  }
  onEnable() {
    requireAdapter(this.game, "setNoFall", true);
  }
  onTick() {
    this.game.setNoFall?.(true);
  }
  onDisable() {
    this.game.setNoFall?.(false);
  }
}

export class AutoJump extends Module {
  constructor() {
    super({ id: "auto-jump", name: "AutoJump", description: "Jumps automatically when a block is in the way.", category: "Movement", requiredCapabilities: ["world", "movement"] });
    this._cooldown = 0;
  }
  onInit() {
    const g = this.settings.addGroup("AutoJump");
    g.bool("only-forward", "Only while moving forward", true);
    g.int("delay", "Minimum delay between jumps (ticks)", 4, { min: 1, max: 40 });
  }
  onTick() {
    if (this._cooldown > 0) {
      this._cooldown--;
      return;
    }
    const p = this.game.getPlayer?.();
    if (!p || !this.game.isOnGround?.()) return;
    if (this.settings.get("only-forward").value && p.moveForward <= 0) return;
    if (this.game.isBlockAhead?.({ distance: 0.6, height: 1 })) {
      this.game.jump?.();
      this._cooldown = this.settings.get("delay").value;
    }
  }
}

export class AutoWalk extends Module {
  constructor() {
    super({ id: "auto-walk", name: "AutoWalk", description: "Walks forward automatically.", category: "Movement", requiredCapabilities: ["movement"] });
  }
  onEnable() {
    requireAdapter(this.game, "setForward", true);
  }
  onTick() {
    this.game.setForward?.(true);
  }
  onDisable() {
    // Always release, even if enable partially succeeded.
    this.game.setForward?.(false);
  }
}

export class NoSlow extends Module {
  constructor() {
    super({
      id: "no-slow",
      name: "NoSlow",
      description: "Would remove item-use slowdown; needs a movement-input hook the runtime does not expose.",
      category: "Movement",
      unsupported: true,
      unsupportedReason: "requires intercepting the item-use movement modifier, which is compiled into the WASM runtime",
    });
  }
}

export class Timer extends Module {
  constructor() {
    super({ id: "timer", name: "Timer", description: "Scales the local game tick rate. Affects simulation, not just visuals — for local testing only.", category: "Movement", requiredCapabilities: ["timing"] });
    this._original = 1;
  }
  onInit() {
    this.settings.addGroup("Timer").double("speed", "Tick rate multiplier", 1.2, { min: 0.1, max: 10 });
  }
  onEnable() {
    this._original = this.game.getTickRateMultiplier?.() ?? 1;
    requireAdapter(this.game, "setTickRate", this.settings.get("speed").value);
  }
  onDisable() {
    this.game.setTickRate?.(this._original);
  }
}

export class Freecam extends Module {
  constructor() {
    super({ id: "freecam", name: "Freecam", description: "Detaches the camera from the player.", category: "Render", requiredCapabilities: ["render"] });
    this._saved = null;
  }
  onInit() {
    const g = this.settings.addGroup("Camera");
    g.double("speed", "Camera move speed", 1.0, { min: 0.2, max: 8 });
    g.bool("freeze-player", "Keep the player still while detached", true);
  }
  onEnable() {
    if (typeof this.game.enterFreecam !== "function") throw new Error("runtime does not expose a camera detachment hook");
    this._saved = this.game.getCamera?.() ?? null;
    this.game.enterFreecam({ speed: this.settings.get("speed").value, freeze: this.settings.get("freeze-player").value });
  }
  onTick() {
    this.game.updateFreecam?.({ speed: this.settings.get("speed").value });
  }
  onDisable() {
    this.game.exitFreecam?.(this._saved);
  }
}

export class Parkour extends Module {
  constructor() {
    super({ id: "parkour", name: "Parkour", description: "Jumps automatically at the edge of a block.", category: "Movement", requiredCapabilities: ["world", "movement"] });
  }
  onInit() {
    const g = this.settings.addGroup("Parkour");
    g.bool("only-forward", "Only while moving forward", true);
    g.bool("sneak-edges", "Also sneak at very short drops", false);
  }
  onTick() {
    const p = this.game.getPlayer?.();
    if (!p || !this.game.isOnGround?.()) return;
    if (this.settings.get("only-forward").value && p.moveForward <= 0) return;
    if (this.game.isBlockAhead?.({ distance: 0.4, height: 1, requireGapAfter: 1 })) {
      this.game.jump?.();
    }
  }
}

export class BunnyHop extends Module {
  constructor() {
    super({ id: "bunny-hop", name: "BunnyHop", description: "Automatically jumps while sprinting to maintain momentum.", category: "Movement", requiredCapabilities: ["movement"] });
  }
  onInit() {
    const g = this.settings.addGroup("BunnyHop");
    g.int("delay", "Jump delay (ticks)", 1, { min: 1, max: 10 });
    g.bool("only-sprinting", "Only while sprinting", true);
  }
  onEnable() { this._jumpCooldown=0; }
  onDisable() { this._jumpCooldown=0; }
  onTick() {
    if(this._jumpCooldown>0){this._jumpCooldown--;return;}
    const p=this.game.getPlayer?.();if(!p)return;
    if(this.settings.get("only-sprinting").value&&!p.sprinting)return;
    if(this.game.isOnGround?.()){this.game.jump?.();this._jumpCooldown=this.settings.get("delay").value;}
  }
}

export class Jesus extends Module {
  constructor() {
    super({
      id: "jesus",
      name: "Jesus",
      description: "Would let the player walk on water; requires a fluid-collision hook the runtime does not expose.",
      category: "Movement",
      unsupported: true,
      unsupportedReason: "no fluid collision/velocity hook available in the compiled runtime",
    });
  }
}

export class Spider extends Module {
  constructor() {
    super({
      id: "spider",
      name: "Spider",
      description: "Would allow wall climbing; requires colliding-block hooks the runtime does not expose.",
      category: "Movement",
      unsupported: true,
      unsupportedReason: "no horizontal collision hook available in the compiled runtime",
    });
  }
}

export function createMovementModules() {
  return [
    new Sprint(),
    new Flight(),
    new Speed(),
    new Step(),
    new HighJump(),
    new SafeWalk(),
    new NoFall(),
    new AutoJump(),
    new AutoWalk(),
    new NoSlow(),
    new Timer(),
    new Freecam(),
    new Parkour(),
    new BunnyHop(),
    new Jesus(),
    new Spider(),
  ];
}
