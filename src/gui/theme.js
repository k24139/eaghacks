/**
 * GUI theme. Mirrors Meteor's `GuiTheme` in that it is a data object consumed
 * by the widgets rather than colours hard-coded at each call site, and it is
 * itself persisted (window positions, accent colour, scale).
 */

export const DEFAULT_THEME = {
  // Meteor-ish dark palette.
  bg: "#15161a",
  panel: "#1c1e23",
  panelAlt: "#23262d",
  header: "#26292f",
  border: "#33373f",
  text: "#e6e7ea",
  textDim: "#9aa0a6",
  textMuted: "#6b7280",
  accent: "#4f8ef7",
  accentText: "#ffffff",
  enabled: "#4f8ef7",
  disabled: "#3a3d45",
  danger: "#d64545",
  warn: "#e0a458",
  ok: "#5bbf7a",
  radius: 6,
  rowHeight: 18,
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  scale: 1,
  backgroundOpacity: 0.96,
  animations: true,
};

/**
 * Theme holder. Widgets read from `theme.colors` etc. so a runtime accent change
 * repaints without reloading the page.
 */
export class Theme {
  constructor(initial = {}) {
    this.values = { ...DEFAULT_THEME, ...initial };
    /** @type {Set<(theme:Theme)=>void>} */
    this._listeners = new Set();
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this._applyCssVars();
    for (const fn of this._listeners) fn(this);
  }

  get accent() {
    return this.values.accent;
  }
  set accent(v) {
    this.set("accent", v);
  }
  get scale() {
    return this.values.scale;
  }
  set scale(v) {
    this.set("scale", clampScale(v));
  }

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Push the theme into CSS custom properties on the given root element. */
  _applyCssVars(root = globalThis.document?.documentElement) {
    if (!root || !root.style) return;
    const v = this.values;
    const map = {
      "--mt-bg": v.bg,
      "--mt-panel": v.panel,
      "--mt-panel-alt": v.panelAlt,
      "--mt-header": v.header,
      "--mt-border": v.border,
      "--mt-text": v.text,
      "--mt-text-dim": v.textDim,
      "--mt-text-muted": v.textMuted,
      "--mt-accent": v.accent,
      "--mt-accent-text": v.accentText,
      "--mt-disabled": v.disabled,
      "--mt-danger": v.danger,
      "--mt-warn": v.warn,
      "--mt-ok": v.ok,
      "--mt-radius": `${v.radius}px`,
      "--mt-font": v.fontFamily,
      "--mt-font-size": `${v.fontSize}px`,
      "--mt-scale": String(v.scale),
    };
    for (const [k, val] of Object.entries(map)) root.style.setProperty(k, val);
  }

  serialise() {
    return { ...this.values };
  }

  load(data) {
    if (!data || typeof data !== "object") return false;
    let changed = false;
    for (const [k, raw] of Object.entries(data)) {
      if (!(k in DEFAULT_THEME)) continue; // reject unknown keys
      const expected = typeof DEFAULT_THEME[k];
      if (typeof raw !== expected) continue;
      const value = k === "scale" ? clampScale(raw) : raw;
      if (this.values[k] !== value) {
        this.values[k] = value;
        changed = true;
      }
    }
    if (changed) this._applyCssVars();
    return changed;
  }

  reset() {
    this.values = { ...DEFAULT_THEME };
    this._applyCssVars();
  }
}

function clampScale(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.5, Math.min(2.5, n));
}

/** Materialises the stylesheet the DOM-based GUI needs (injected once). */
export function ensureStyles(doc = globalThis.document) {
  if (!doc || doc.getElementById("meteor-gui-styles")) return;
  const style = doc.createElement("style");
  style.id = "meteor-gui-styles";
  style.textContent = CSS_TEXT;
  doc.head.appendChild(style);
}

const CSS_TEXT = `
.mt-root, .mt-root * { box-sizing: border-box; }
.mt-root {
  position: fixed; inset: 0; display: none; z-index: 2147483000;
  font-family: var(--mt-font); font-size: var(--mt-font-size); color: var(--mt-text);
  user-select: none; -webkit-user-select: none;
  pointer-events: none;
}
.mt-root.mt-open { display: block; }
.mt-root.mt-open .mt-window { pointer-events: auto; }
.mt-backdrop { position: absolute; inset: 0; background: transparent; }
.mt-window {
  position: absolute; background: var(--mt-panel); border: 1px solid var(--mt-border);
  border-radius: var(--mt-radius); overflow: hidden;
  box-shadow: 0 8px 28px rgba(0,0,0,.5);
  display: flex; flex-direction: column;
}
.mt-window.mt-dragging { opacity: .92; }
.mt-header {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  background: var(--mt-header); cursor: grab; border-bottom: 1px solid var(--mt-border);
  font-weight: 600; letter-spacing: .3px;
}
.mt-header:active { cursor: grabbing; }
.mt-header .mt-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.mt-header .mt-title { flex: 1; }
.mt-header .mt-count { color: var(--mt-text-muted); font-weight: 400; }
.mt-header .mt-collapse { cursor: pointer; color: var(--mt-text-dim); padding: 0 2px; }
.mt-body { overflow-y: auto; overflow-x: hidden; max-height: 60vh; }
.mt-body::-webkit-scrollbar { width: 8px; }
.mt-body::-webkit-scrollbar-thumb { background: var(--mt-border); border-radius: 4px; }
.mt-module { border-bottom: 1px solid rgba(255,255,255,.03); }
.mt-row {
  display: flex; align-items: center; gap: 6px; padding: 3px 8px; cursor: pointer;
  min-height: var(--mt-row-height, 18px);
}
.mt-row:hover { background: var(--mt-panel-alt); }
.mt-row .mt-name { flex: 1; }
.mt-row.mt-on .mt-name { color: var(--mt-accent); font-weight: 600; }
.mt-row.mt-unsupported { opacity: .45; cursor: not-allowed; }
.mt-row .mt-bind { color: var(--mt-text-muted); font-size: .92em; }
.mt-row .mt-fav { color: var(--mt-warn); }
.mt-expand { padding: 4px 8px 8px; background: rgba(0,0,0,.18); }
.mt-group-title {
  color: var(--mt-text-dim); text-transform: uppercase; font-size: .85em; letter-spacing: .6px;
  margin: 6px 0 3px; cursor: pointer;
}
.mt-setting { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.mt-setting > label { flex: 1; color: var(--mt-text-dim); }
.mt-setting input[type="text"], .mt-setting select {
  background: var(--mt-bg); color: var(--mt-text); border: 1px solid var(--mt-border);
  border-radius: 4px; padding: 2px 4px; font: inherit; max-width: 130px;
}
.mt-setting input[type="range"] { flex: 1; max-width: 120px; accent-color: var(--mt-accent); }
.mt-num { color: var(--mt-text); min-width: 40px; text-align: right; }
.mt-check { width: 13px; height: 13px; border-radius: 3px; border: 1px solid var(--mt-border); display: inline-block; }
.mt-check.mt-checked { background: var(--mt-accent); border-color: var(--mt-accent); }
.mt-swatch { width: 34px; height: 14px; border-radius: 3px; border: 1px solid var(--mt-border); cursor: pointer; }
.mt-bindbtn {
  background: var(--mt-bg); border: 1px solid var(--mt-border); color: var(--mt-text);
  border-radius: 4px; padding: 1px 6px; font: inherit; cursor: pointer; min-width: 70px;
}
.mt-bindbtn.mt-capturing { border-color: var(--mt-accent); color: var(--mt-accent); }
.mt-search {
  width: 100%; background: var(--mt-bg); color: var(--mt-text); border: 1px solid var(--mt-border);
  border-radius: 4px; padding: 5px 7px; font: inherit;
}
.mt-btn {
  background: var(--mt-panel-alt); border: 1px solid var(--mt-border); color: var(--mt-text);
  border-radius: 4px; padding: 3px 8px; font: inherit; cursor: pointer;
}
.mt-btn:hover { border-color: var(--mt-accent); }
.mt-btn.mt-primary { background: var(--mt-accent); color: var(--mt-accent-text); border-color: var(--mt-accent); }
.mt-tooltip {
  position: fixed; z-index: 2147483100; max-width: 280px; padding: 6px 8px;
  background: rgba(10,11,13,.97); border: 1px solid var(--mt-border); border-radius: 4px;
  color: var(--mt-text-dim); pointer-events: none; line-height: 1.35;
}
.mt-tooltip .mt-tt-title { color: var(--mt-text); font-weight: 600; margin-bottom: 2px; }
.mt-hud-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147482000; display: none; }
.mt-hud-root.mt-hud-on { display: block; }
.mt-hud-el { position: absolute; }
.mt-hud-editor .mt-hud-el { pointer-events: auto; outline: 1px dashed rgba(255,255,255,.35); cursor: move; }
.mt-hud-editor .mt-hud-el:hover { outline-color: var(--mt-accent); }
.mt-toast-wrap { position: fixed; right: 8px; bottom: 8px; z-index: 2147483200; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }
.mt-toast { background: rgba(10,11,13,.94); border-left: 3px solid var(--mt-accent); border-radius: 4px; padding: 5px 9px; color: var(--mt-text); }
.mt-toast.mt-warn { border-left-color: var(--mt-warn); }
.mt-toast.mt-error { border-left-color: var(--mt-danger); }
.mt-hidden { display: none !important; }
`;

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}
