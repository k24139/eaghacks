/**
 * Render modules.
 *
 * These talk to the game only through the GameAdapter contract:
 *   adapter.setBrightness(v)              Fullbright
 *   adapter.setFov(deg) / getFov()        Zoom
 *   adapter.worldToScreen(x,y,z)          ESP / Tracers / Nametags / Waypoints
 *   adapter.getViewport()                 overlay sizing
 * Events.RenderWorld is dispatched by the host with { ctx, projection, frame }
 * once per frame while a world is loaded; Events.RenderHud carries the 2D
 * overlay context. Anything the adapter cannot provide is expressed as a
 * missing capability, so the module refuses to enable rather than drawing
 * nothing silently.
 */
import { Module } from "../core/module.js";
import { Events } from "../core/event-bus.js";

function rgba(color, alphaOverride) {
  const a = alphaOverride ?? color.a / 255;
  return `rgba(${color.r},${color.g},${color.b},${a})`;
}

function entityLabel(e, { showDistance, showHealth, playerDist }) {
  let label = e.name ?? e.type ?? "entity";
  const parts = [];
  if (showHealth && typeof e.health === "number") parts.push(`${e.health.toFixed(0)}hp`);
  if (showDistance && playerDist !== undefined) parts.push(`${playerDist.toFixed(1)}m`);
  if (parts.length) label += ` (${parts.join(", ")})`;
  return label;
}

// ---------------------------------------------------------------------------

export class Fullbright extends Module {
  constructor() {
    super({
      id: "fullbright",
      name: "Fullbright",
      description: "Raises world brightness. Restores the original value on disable.",
      category: "Render",
      requiredCapabilities: ["world"],
    });
    this._original = null;
  }
  onInit() {
    const g = this.settings.addGroup("Brightness");
    g.double("level", "Brightness value", 1.0, { min: 0, max: 1 });
    g.bool("night-vision", "Also apply a night-vision style effect when supported", false);
  }
  onEnable() {
    const game = this.game;
    this._original = game.getBrightness?.() ?? null;
    const applied = game.setBrightness?.(this.settings.get("level").value);
    if (applied === false) throw new Error("adapter rejected setBrightness");
  }
  onDisable() {
    if (this._original !== null) this.game.setBrightness?.(this._original);
    else this.game.setBrightness?.(0);
  }
  onTick() {
    this.game.setBrightness?.(this.settings.get("level").value);
  }
}

export class Zoom extends Module {
  constructor() {
    super({
      id: "zoom",
      name: "Zoom",
      description: "Hold the bind to zoom in. Restores the original FOV on release.",
      category: "Render",
      requiredCapabilities: ["world"],
    });
    this._originalFov = null;
    this._zoomed = false;
  }
  onInit() {
    const g = this.settings.addGroup("Zoom");
    g.double("factor", "Zoom factor (higher = closer)", 4, { min: 1.2, max: 12 });
    g.bool("smooth", "Smoothly interpolate the zoom", true);
    this.bind.set({ key: "KeyC", mouse: null, modifiers: {} });
  }
  onEnable() {
    this._originalFov = this.game.getFov?.() ?? null;
    this._apply(true);
  }
  onDisable() {
    if (this._originalFov !== null) this.game.setFov?.(this._originalFov);
    this._zoomed = false;
  }
  onTick() {
    this._apply(false);
  }
  _apply(instant) {
    const base = this._originalFov ?? 70;
    const target = base / this.settings.get("factor").value;
    const smooth = this.settings.get("smooth").value;
    const current = this.game.getFov?.() ?? base;
    const next = instant || !smooth ? target : current + (target - current) * 0.35;
    this.game.setFov?.(next);
    this._zoomed = true;
  }
}

export class CustomCrosshair extends Module {
  constructor() {
    super({
      id: "custom-crosshair",
      name: "Custom Crosshair",
      description: "Draws a configurable crosshair over the game.",
      category: "Render",
      requiredCapabilities: ["hud"],
      runsInMenus: false,
    });
    this._sub = null;
  }
  onInit() {
    const g = this.settings.addGroup("Appearance");
    g.enum("shape", "Crosshair shape", "cross", ["cross", "dot", "square", "circle", "t-shape"]);
    g.double("size", "Size in pixels", 10, { min: 2, max: 60 });
    g.double("thickness", "Line thickness", 1.5, { min: 0.5, max: 6 });
    g.color("color", "Colour", { r: 255, g: 255, b: 255, a: 210 });
    g.bool("hide-vanilla", "Hide the game's own crosshair", true);
    g.double("gap", "Centre gap (cross/t-shape)", 2, { min: 0, max: 20 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderHud, (ev) => this.draw(ev));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  draw({ ctx, viewport }) {
    if (!ctx || !viewport) return;
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    const size = this.settings.get("size").value;
    const gap = this.settings.get("gap").value;
    const th = this.settings.get("thickness").value;
    const color = this.settings.get("color");
    ctx.save();
    ctx.strokeStyle = rgba(color);
    ctx.fillStyle = rgba(color);
    ctx.lineWidth = th;
    const shape = this.settings.get("shape").value;
    if (shape === "dot") {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, th), 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === "square") {
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    } else if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape === "t-shape") {
      ctx.beginPath();
      ctx.moveTo(cx - size, cy);
      ctx.lineTo(cx + size, cy);
      ctx.moveTo(cx, cy + gap);
      ctx.lineTo(cx, cy + size);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - gap - size, cy);
      ctx.lineTo(cx - gap, cy);
      ctx.moveTo(cx + gap, cy);
      ctx.lineTo(cx + gap + size, cy);
      ctx.moveTo(cx, cy - gap - size);
      ctx.lineTo(cx, cy - gap);
      ctx.moveTo(cx, cy + gap);
      ctx.lineTo(cx, cy + gap + size);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Shared base for world-space ESP-style modules. */
class WorldRenderModule extends Module {
  constructor(def) {
    super({ category: "Render", requiredCapabilities: ["world", "entities", "render", "hud"], ...def });
    this._sub = null;
  }
  onInit() {
    this._buildSettings();
  }
  /** subclasses define filter + visual settings */
  _buildSettings() {
    const f = this.settings.addGroup("Filter");
    f.int("range", "Maximum distance (blocks)", this.defaultRange ?? 64, { min: 4, max: 256 });
    f.bool("players", "Target players", true);
    f.bool("hostile", "Target hostile mobs", true);
    f.bool("passive", "Target passive mobs", false);
    f.bool("invisible", "Include invisible entities", false);
    const v = this.settings.addGroup("Visual");
    v.color("color", "Primary colour", this.defaultColor ?? { r: 255, g: 80, b: 80, a: 200 });
    v.color("player-color", "Player colour", { r: 80, g: 200, b: 255, a: 200 });
    v.double("alpha", "Opacity", 0.8, { min: 0.05, max: 1 });
  }
  /** @returns {Array} filtered entities within range with distance attached */
  candidates(game) {
    const player = game.getPlayer();
    if (!player) return [];
    const range = this.settings.get("range").value;
    const wantPlayers = this.settings.get("players").value;
    const wantHostile = this.settings.get("hostile").value;
    const wantPassive = this.settings.get("passive").value;
    const wantInvisible = this.settings.get("invisible").value;
    const out = [];
    for (const e of game.getEntities()) {
      if (!e || e.isSelf) continue;
      const kind = e.kind ?? (e.isPlayer ? "player" : e.hostile ? "hostile" : "passive");
      if (kind === "player" && !wantPlayers) continue;
      if (kind === "hostile" && !wantHostile) continue;
      if (kind === "passive" && !wantPassive) continue;
      if (e.invisible && !wantInvisible) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const dz = e.z - player.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!Number.isFinite(dist) || dist > range) continue;
      out.push({ entity: e, dist, kind });
    }
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderWorld, (ev) => this.renderWorld(ev));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  renderWorld(_ev) {}
}

export class EntityESP extends WorldRenderModule {
  constructor() {
    super({
      id: "entity-esp",
      name: "Entity ESP",
      description: "Draws boxes around selected entities.",
      defaultRange: 64,
      defaultColor: { r: 255, g: 80, b: 80, a: 200 },
    });
  }
  _buildSettings() {
    super._buildSettings();
    const v = this.settings.groups.find((g) => g.name === "Visual");
    v.bool("boxes", "Draw bounding boxes", true);
    v.bool("filled", "Fill the box", false);
    v.double("line-width", "Outline thickness", 1.5, { min: 0.5, max: 5 });
    v.bool("health-bar", "Draw a health bar beside the box", false);
  }
  renderWorld({ ctx, projection, frame }) {
    const game = this.game;
    const alpha = this.settings.get("alpha").value;
    const lineWidth = this.settings.get("line-width").value;
    const boxes = this.settings.get("boxes").value;
    const filled = this.settings.get("filled").value;
    const healthBar = this.settings.get("health-bar").value;
    const playerColor = this.settings.get("player-color");
    const baseColor = this.settings.get("color");
    for (const { entity, dist, kind } of this.candidates(game)) {
      const color = kind === "player" ? playerColor : baseColor;
      const bounds = projection?.projectEntity?.(entity) ?? this._boundsFromCorners(entity, projection);
      if (!bounds || bounds.behind) continue;
      if (boxes) {
        ctx.save();
        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = lineWidth;
        if (filled) {
          ctx.fillStyle = rgba(color, alpha * 0.25);
          ctx.fillRect(bounds.x1, bounds.y1, bounds.x2 - bounds.x1, bounds.y2 - bounds.y1);
        }
        ctx.strokeRect(bounds.x1, bounds.y1, bounds.x2 - bounds.x1, bounds.y2 - bounds.y1);
        ctx.restore();
      }
      if (healthBar && typeof entity.health === "number" && typeof entity.maxHealth === "number") {
        const h = bounds.y2 - bounds.y1;
        const frac = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(bounds.x2 + 3, bounds.y1, 3, h);
        ctx.fillStyle = frac > 0.5 ? "#5bbf7a" : frac > 0.25 ? "#e0a458" : "#d64545";
        ctx.fillRect(bounds.x2 + 3, bounds.y1 + h * (1 - frac), 3, h * frac);
        ctx.restore();
      }
    }
  }
  /** Fallback box when the projection only offers worldToScreen. */
  _boundsFromCorners(entity, projection) {
    if (!projection?.worldToScreen) return null;
    const w = entity.width ?? 0.6;
    const h = entity.height ?? 1.8;
    const pts = [
      [entity.x - w / 2, entity.y, entity.z - w / 2],
      [entity.x + w / 2, entity.y, entity.z + w / 2],
      [entity.x - w / 2, entity.y + h, entity.z - w / 2],
      [entity.x + w / 2, entity.y + h, entity.z + w / 2],
    ].map(([x, y, z]) => projection.worldToScreen(x, y, z));
    const visible = pts.filter((p) => p && p.visible);
    if (visible.length === 0) return null;
    const xs = visible.map((p) => p.x);
    const ys = visible.map((p) => p.y);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys), behind: false };
  }
}

export class Tracers extends WorldRenderModule {
  constructor() {
    super({ id: "tracers", name: "Tracers", description: "Draws lines pointing at selected entities.", defaultRange: 96, defaultColor: { r: 120, g: 200, b: 255, a: 200 } });
  }
  _buildSettings() {
    super._buildSettings();
    const v = this.settings.groups.find((g) => g.name === "Visual");
    v.enum("origin", "Line origin", "crosshair", ["crosshair", "top", "bottom", "player"]);
    v.double("line-width", "Thickness", 1.2, { min: 0.4, max: 5 });
  }
  renderWorld({ ctx, projection, viewport }) {
    const alpha = this.settings.get("alpha").value;
    const originMode = this.settings.get("origin").value;
    const lw = this.settings.get("line-width").value;
    const origin = this._origin(originMode, viewport, projection);
    if (!origin) return;
    ctx.save();
    ctx.lineWidth = lw;
    for (const { entity, kind } of this.candidates(this.game)) {
      const p = projection?.projectEntityCentered?.(entity) ?? projection?.worldToScreen?.(entity.x, entity.y + (entity.height ?? 1.8) / 2, entity.z);
      if (!p || p.behind) continue;
      ctx.strokeStyle = rgba(kind === "player" ? this.settings.get("player-color") : this.settings.get("color"), alpha);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  _origin(mode, viewport, projection) {
    if (!viewport) return null;
    if (mode === "top") return { x: viewport.width / 2, y: 0 };
    if (mode === "bottom") return { x: viewport.width / 2, y: viewport.height };
    if (mode === "player") {
      const player = this.game.getPlayer();
      const p = player && projection?.worldToScreen?.(player.x, player.y + 1.2, player.z);
      return p ?? { x: viewport.width / 2, y: viewport.height / 2 };
    }
    return { x: viewport.width / 2, y: viewport.height / 2 };
  }
}

export class Nametags extends WorldRenderModule {
  constructor() {
    super({ id: "nametags", name: "Nametags", description: "Custom labels above entities.", defaultRange: 48, defaultColor: { r: 255, g: 255, b: 255, a: 230 } });
  }
  _buildSettings() {
    super._buildSettings();
    const v = this.settings.groups.find((g) => g.name === "Visual");
    v.bool("distance", "Show distance", true);
    v.bool("health", "Show health", true);
    v.bool("background", "Draw a background box", true);
    v.double("scale", "Text scale", 1, { min: 0.5, max: 2.5 });
  }
  renderWorld({ ctx, projection }) {
    const scale = this.settings.get("scale").value;
    const withBg = this.settings.get("background").value;
    const showDist = this.settings.get("distance").value;
    const showHealth = this.settings.get("health").value;
    const color = this.settings.get("color");
    ctx.save();
    ctx.font = `${11 * scale}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    for (const { entity, dist } of this.candidates(this.game)) {
      const p = projection?.worldToScreen?.(entity.x, entity.y + (entity.height ?? 1.8) + 0.3, entity.z);
      if (!p || p.behind) continue;
      const label = entityLabel(entity, { showDistance: showDist, showHealth: showHealth, playerDist: dist });
      const w = ctx.measureText(label).width;
      if (withBg) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(p.x - w / 2 - 3, p.y - 14 * scale, w + 6, 15 * scale);
      }
      ctx.fillStyle = rgba(color);
      ctx.fillText(label, p.x, p.y);
    }
    ctx.restore();
  }
}

export class StorageESP extends Module {
  constructor() {
    super({
      id: "storage-esp",
      name: "Storage ESP",
      description: "Highlights nearby storage containers.",
      category: "Render",
      requiredCapabilities: ["world", "blocks", "render"],
    });
    this._sub = null;
  }
  onInit() {
    const f = this.settings.addGroup("Filter");
    f.int("range", "Search radius", 32, { min: 4, max: 128 });
    f.bool("chests", "Chests and barrels", true);
    f.bool("furnaces", "Furnaces", true);
    f.bool("dispensers", "Dispensers and droppers", false);
    f.bool("shulkers", "Shulker boxes", false);
    const v = this.settings.addGroup("Visual");
    v.color("color", "Box colour", { r: 240, g: 200, b: 70, a: 180 });
    v.double("alpha", "Opacity", 0.75, { min: 0.05, max: 1 });
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderWorld, ({ ctx, projection }) => this._draw(ctx, projection));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  _draw(ctx, projection) {
    const player = this.game.getPlayer?.();
    if (!player || !this.game.findBlocks) return;
    const wanted = [];
    if (this.settings.get("chests").value) wanted.push("chest", "trapped_chest", "barrel");
    if (this.settings.get("furnaces").value) wanted.push("furnace", "blast_furnace", "smoker");
    if (this.settings.get("dispensers").value) wanted.push("dispenser", "dropper");
    if (this.settings.get("shulkers").value) wanted.push("shulker_box");
    const found = this.game.findBlocks(wanted, this.settings.get("range").value);
    ctx.save();
    ctx.strokeStyle = rgba(this.settings.get("color"), this.settings.get("alpha").value);
    for (const b of found ?? []) {
      const p = projection?.worldToScreen?.(b.x, b.y, b.z);
      if (p && !p.behind) ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
    }
    ctx.restore();
  }
}

/** Radar is a HUD element rather than a world overlay. */
export class Radar extends Module {
  constructor() {
    super({
      id: "radar",
      name: "Radar",
      description: "Minimap-style radar of nearby entities.",
      category: "HUD",
      requiredCapabilities: ["world", "entities", "hud"],
      runsInMenus: false,
      defaultX: 400,
      defaultY: 4,
    });
    this._sub = null;
  }
  onInit() {
    const g = this.settings.addGroup("Radar");
    g.int("range", "Radar range (blocks)", 48, { min: 8, max: 200 });
    g.int("size", "Radar size (px)", 110, { min: 60, max: 260 });
    g.bool("rotate", "Rotate with player orientation", true);
    g.bool("players", "Show players", true);
    g.bool("mobs", "Show mobs", true);
    const l = this.settings.addGroup("Layout");
    l.int("hud-x", "Horizontal position", 400, { min: 0, max: 4000 });
    l.int("hud-y", "Vertical position", 4, { min: 0, max: 4000 });
  }
  hudRender() {
    // When the game canvas path is available the radar is drawn there; the DOM
    // node must stay empty so the two do not double up.
    if (this.game?.hasCapability?.("hud") && this.game?.getCanvas?.()) return "";
    const c = this._candidates();
    if (c.length === 0) return "";
    return c.slice(0, 6).map((e) => `${e.dx >= 0 ? "→" : "←"}${Math.abs(e.dist).toFixed(0)}`).join(" ");
  }
  _candidates() {
    const player = this.game.getPlayer?.();
    if (!player) return [];
    const range = this.settings.get("range").value;
    const out = [];
    for (const e of this.game.getEntities?.() ?? []) {
      if (e.isSelf) continue;
      if (e.isPlayer && !this.settings.get("players").value) continue;
      if (!e.isPlayer && !this.settings.get("mobs").value) continue;
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > range) continue;
      out.push({ dx, dz, dist, entity: e });
    }
    return out;
  }
  onEnable() {
    this._sub = this.subscribe(Events.RenderHud, (ev) => this._draw(ev));
  }
  onDisable() {
    this._sub?.dispose();
    this._sub = null;
  }
  _draw({ ctx }) {
    if (!ctx) return;
    // Canvas path: draw a circular radar. In DOM mode hudRender() provides text.
    const size = this.settings.get("size").value;
    const range = this.settings.get("range").value;
    const player = this.game.getPlayer?.();
    if (!player) return;
    const x = this.settings.get("hud-x").value + size / 2;
    const y = this.settings.get("hud-y").value + size / 2;
    const r = size / 2;
    const rotate = this.settings.get("rotate").value;
    const yawRad = rotate ? (-(player.yaw ?? 0) * Math.PI) / 180 : 0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    for (const c of this._candidates()) {
      const cos = Math.cos(yawRad);
      const sin = Math.sin(yawRad);
      const rx = c.dx * cos - c.dz * sin;
      const rz = c.dx * sin + c.dz * cos;
      const px = x + (rx / range) * r;
      const py = y + (rz / range) * r;
      ctx.fillStyle = c.entity.isPlayer ? "#4f8ef7" : "#d64545";
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Modules whose mechanics the adapter can toggle directly. */
export class NoHurtCam extends Module {
  constructor() {
    super({ id: "no-hurt-cam", name: "NoHurtCam", description: "Removes the camera tilt when damaged.", category: "Render", requiredCapabilities: ["world"] });
  }
  onInit() {
    this.settings.addGroup("General").bool("tilt", "Also remove the directional tilt", true);
  }
  onEnable() {
    if (this.game.setHurtCam) {
      this.game.setHurtCam(false);
      return;
    }
    throw new Error("adapter does not expose camera-hurt control");
  }
  onDisable() {
    this.game.setHurtCam?.(true);
  }
}

/**
 * X-Ray needs render-pipeline access (per-block face visibility). Eaglercraft's
 * renderer is compiled; without a verified hook we mark this unsupported rather
 * than ship a toggle that appears to do nothing.
 */
export class XRay extends Module {
  constructor() {
    super({
      id: "xray",
      name: "X-Ray",
      description: "Would expose ores through walls; requires a block-visibility hook the runtime does not expose.",
      category: "Render",
      unsupported: true,
      unsupportedReason: "no supported block-face visibility hook in the Eaglercraft renderer",
    });
  }
  onInit() {
    const g = this.settings.addGroup("Blocks");
    g.string("ores", "Ore list (comma separated)", "diamond_ore,gold_ore,iron_ore,emerald_ore,ancient_debris");
    g.double("opacity", "Non-ore opacity", 0.15, { min: 0, max: 1 });
  }
}

export function createRenderModules() {
  return [
    new Fullbright(),
    new Zoom(),
    new CustomCrosshair(),
    new EntityESP(),
    new Tracers(),
    new Nametags(),
    new StorageESP(),
    new Radar(),
    new NoHurtCam(),
    new XRay(),
  ];
}
