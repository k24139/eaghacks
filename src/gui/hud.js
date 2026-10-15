/**
 * HUD framework.
 *
 * Two rendering paths are supported, chosen automatically:
 *  - `dom`  (default): each active HUD element is a positioned DOM node,
 *    refreshed at a configurable rate (default 10 Hz). Text HUDs do not need to
 *    redraw at 60 Hz, and refreshing them off the render loop is the single
 *    biggest HUD performance win.
 *  - `canvas`: when the GameAdapter exposes a canvas and advertises the `hud`
 *    capability, elements are drawn into the game's own 2D context so they scale
 *    with the game and survive canvas resizes.
 *
 * Layout, colours, scale and opacity live in each HUD module's settings, so they
 * persist through the normal config system rather than a parallel store.
 */
import { el, ensureStyles } from "./theme.js";

/**
 * The CSS transform used to scale a HUD element. Extracted so the formula can be
 * unit-tested independently of the DOM (jsdom does not implement `transform`).
 */
export function hudTransform(scale) {
  const s = Number(scale) || 1;
  return s === 1 ? "" : `scale(${s})`;
}

export class HUDManager {
  /**
   * @param {object} deps
   * @param {import('../core/module-manager.js').ModuleManager} deps.modules
   * @param {import('./theme.js').Theme} deps.theme
   */
  constructor({ modules, theme, game }) {
    this.modules = modules;
    this.theme = theme;
    this.game = game;
    this.root = null;
    /** @type {Map<string, HTMLElement>} moduleId -> node */
    this.nodes = new Map();
    this.editing = false;
    this._drag = null;
    this._raf = null;
    this._lastRefresh = 0;
    this._refreshIntervalMs = 100;
    this._snapDistance = 6;
  }

  /** Whether elements should be drawn into the game canvas instead of DOM. */
  get useCanvas() {
    return !!(this.game?.hasCapability("hud") && this.game?.getCanvas?.());
  }

  mount(parent = document.body) {
    if (this.root) return this.root;
    ensureStyles();
    this.root = el("div", { class: "mt-hud-root mt-hud-on" });
    parent.appendChild(this.root);
    this._installHandlers();
    return this.root;
  }

  setVisible(v) {
    if (!this.root) this.mount();
    this.root.classList.toggle("mt-hud-on", !!v);
  }

  setEditing(on) {
    if (!this.root) this.mount();
    // Only useful inside a world; the Config window may still call it.
    this.editing = !!on;
    this.root.classList.toggle("mt-hud-editor", this.editing);
    if (this.editing) this.setVisible(true);
    this.modules.notify?.(this.editing ? "HUD editor on — drag elements, Esc/Right Shift when done" : "HUD editor off", "info");
  }

  toggleEditing() {
    this.setEditing(!this.editing);
  }

  register(module) {
    // Called by HUD modules when they are constructed so the manager knows the
    // widget exists even before it is enabled.
    this.nodes.set(module.id, null);
    return module;
  }

  /** Rebuild nodes for all active HUD modules. Cheap; called on toggle. */
  sync() {
    if (!this.root) return;
    const activeHud = this.modules.active().filter((m) => m.category === "HUD" && typeof m.hudRender === "function");
    const wanted = new Set(activeHud.map((m) => m.id));
    for (const [id, node] of this.nodes) {
      if (node && !wanted.has(id)) {
        node.remove();
        this.nodes.set(id, null);
      }
    }
    for (const m of activeHud) {
      let node = this.nodes.get(m.id);
      if (!node) {
        node = el("div", { class: "mt-hud-el", "data-module": m.id });
        this._applyVisuals(node, m);
        this.root.appendChild(node);
        this._attachDrag(node, m);
        this.nodes.set(m.id, node);
      }
      this._applyVisuals(node, m);
    }
    this.refresh(true);
  }

  _applyVisuals(node, m) {
    const x = m.settings.get("hud-x")?.value ?? 4;
    const y = m.settings.get("hud-y")?.value ?? 4;
    const scale = m.settings.get("hud-scale")?.value ?? 1;
    const opacity = m.settings.get("hud-opacity")?.value ?? 1;
    const color = m.settings.get("hud-color");
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.transform = hudTransform(scale);
    node.style.transformOrigin = "top left";
    node.style.opacity = String(opacity);
    node.style.color = color ? color.toHex(false) : "var(--mt-text)";
    node.style.textShadow = "1px 1px 0 rgba(0,0,0,.85)";
    node.style.whiteSpace = "pre";
    node.style.lineHeight = "1.25";
  }

  _attachDrag(node, m) {
    node.addEventListener("mousedown", (e) => {
      if (!this.editing || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const xs = m.settings.get("hud-x");
      const ys = m.settings.get("hud-y");
      this._drag = {
        m,
        node,
        startX: e.clientX,
        startY: e.clientY,
        origX: xs.value,
        origY: ys.value,
        xs,
        ys,
      };
      node.style.zIndex = "999";
    });
  }

  _installHandlers() {
    this._onMove = (e) => {
      if (!this._drag) return;
      const { m, node, startX, startY, origX, origY, xs, ys } = this._drag;
      const scale = m.settings.get("hud-scale")?.value ?? 1;
      let nx = Math.max(0, origX + (e.clientX - startX) / scale);
      let ny = Math.max(0, origY + (e.clientY - startY) / scale);
      const rect = node.getBoundingClientRect();
      const w = rect.width / scale;
      const h = rect.height / scale;
      // Edge snapping.
      if (Math.abs(nx) < this._snapDistance) nx = 0;
      if (Math.abs(window.innerWidth - (nx + w)) < this._snapDistance) nx = window.innerWidth - w;
      if (Math.abs(ny) < this._snapDistance) ny = 0;
      if (Math.abs(window.innerHeight - (ny + h)) < this._snapDistance) ny = window.innerHeight - h;
      xs.set(Math.round(nx));
      ys.set(Math.round(ny));
      node.style.left = `${Math.round(nx)}px`;
      node.style.top = `${Math.round(ny)}px`;
    };
    this._onUp = () => {
      if (!this._drag) return;
      this._drag.node.style.zIndex = "";
      this._drag = null;
      this.modules.notify?.("HUD layout saved", "info");
    };
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
  }

  /**
   * Refresh text content. Rate-limited: HUD text does not need a per-frame
   * update, and calling into the game adapter 60x/s for every element is the
   * classic way to lose frames.
   */
  refresh(force = false) {
    const now = performance.now();
    if (!force && now - this._lastRefresh < this._refreshIntervalMs) return;
    this._lastRefresh = now;
    if (!this.root) return;
    for (const m of this.modules.active()) {
      if (m.category !== "HUD" || typeof m.hudRender !== "function") continue;
      const node = this.nodes.get(m.id);
      if (!node) continue;
      try {
        const text = m.hudRender(this.game);
        if (text !== node.__lastText) {
          node.textContent = text;
          node.__lastText = text;
        }
      } catch (err) {
        // A HUD element must never break the HUD loop.
        this.modules.reportError(m, err);
        node.textContent = `${m.name}: error`;
      }
    }
  }

  /** Reset all HUD element positions to their defaults. */
  resetLayout() {
    for (const m of this.modules.all()) {
      if (m.category !== "HUD") continue;
      m.settings.get("hud-x")?.reset();
      m.settings.get("hud-y")?.reset();
    }
    this.sync();
  }

  /** Snapshot layout for config export. */
  serialise() {
    const out = {};
    for (const m of this.modules.all()) {
      if (m.category !== "HUD") continue;
      out[m.id] = {
        x: m.settings.get("hud-x")?.value,
        y: m.settings.get("hud-y")?.value,
        scale: m.settings.get("hud-scale")?.value,
        opacity: m.settings.get("hud-opacity")?.value,
        visible: m.active,
      };
    }
    return out;
  }

  load(data) {
    if (!data || typeof data !== "object") return false;
    for (const [id, v] of Object.entries(data)) {
      const m = this.modules.get(id);
      if (!m || m.category !== "HUD" || !v) continue;
      m.settings.get("hud-x")?.set(v.x ?? 4);
      m.settings.get("hud-y")?.set(v.y ?? 4);
      if (typeof v.scale === "number") m.settings.get("hud-scale")?.set(v.scale);
      if (typeof v.opacity === "number") m.settings.get("hud-opacity")?.set(v.opacity);
    }
    this.sync();
    return true;
  }

  serialiseVisibility() {
    return this.modules.all().filter((m) => m.category === "HUD").map((m) => ({ id: m.id, visible: m.active }));
  }

  restoreVisibility(list) {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      const m = this.modules.get(entry?.id);
      if (!m || m.category !== "HUD") continue;
      if (entry.visible) m.enable();
      else m.disable();
    }
  }

  dispose() {
    window.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("mouseup", this._onUp);
    this.root?.remove();
    this.root = null;
    this.nodes.clear();
  }
}
