/**
 * ClickGUI — Meteor-style category windows.
 *
 * Interaction model (matches the brief and Meteor's ModulesScreen):
 *   - Right Shift opens/closes
 *   - left-click a module row toggles it
 *   - right-click a module row expands its settings inline
 *   - drag a window by its header
 *   - scroll inside a window
 *   - type in the search box to filter every category
 *
 * Rendered with DOM rather than the game canvas. Rationale: the browser gives
 * us text inputs, scrolling, hover and accessibility for free, exactly at 60fps
 * because the overlay is static between interactions. The canvas is reserved
 * for world-space rendering and the HUD, which must align with the game.
 */
import { el, ensureStyles } from "./theme.js";
import { createGroupWidget } from "./widgets.js";
import { CATEGORIES } from "../core/module-manager.js";

export class ClickGUI {
  /**
   * @param {object} deps
   * @param {import('../core/module-manager.js').ModuleManager} deps.modules
   * @param {import('./theme.js').Theme} deps.theme
   * @param {import('../core/keybind-manager.js').KeybindManager} deps.keybinds
   * @param {{show:Function,hide:Function}} deps.tooltips
   * @param {object} [deps.hudEditor] optional to open the HUD editor from Config
   */
  constructor({ modules, theme, keybinds, tooltips, hudEditor, config, notify }) {
    this.modules = modules;
    this.theme = theme;
    this.keybinds = keybinds;
    this.tooltips = tooltips;
    this.hudEditor = hudEditor;
    this.config = config;
    this.notify = notify ?? (() => {});
    this.root = null;
    this.windows = new Map(); // categoryId -> {el, x, y, expanded, bodyEl}
    this.searchQuery = "";
    this._open = false;
    this._layoutLoaded = false;
    /** @type {Map<string,{x:number,y:number,expanded:boolean}>} */
    this.layout = new Map();
    this._dragState = null;
  }

  get open() {
    return this._open;
  }

  // -- lifecycle ------------------------------------------------------------

  mount(parent = document.body) {
    if (this.root) return this.root;
    ensureStyles();
    this.theme._applyCssVars();
    this.root = el("div", { class: "mt-root", id: "meteor-clickgui" }, [el("div", { class: "mt-backdrop" })]);
    this.tooltipEl = el("div", { class: "mt-tooltip mt-hidden" });
    this.toastWrap = el("div", { class: "mt-toast-wrap" });
    parent.appendChild(this.root);
    parent.appendChild(this.tooltipEl);
    parent.appendChild(this.toastWrap);
    this._buildWindows();
    this._installGlobalHandlers();
    this._tileWindows();
    this._applyLayout();
    this._open = false;
    return this.root;
  }

  toggle() {
    return this._open ? this.close() : this.show();
  }

  show() {
    if (!this.root) this.mount();
    this._open = true;
    this.root.classList.add("mt-open");
    this._applyLayout();
    this._open_ = true;
    this.keybinds.guiOpen = true;
    // Hand the game a chance to release pointer lock so the user can click.
    this.modules.game?.setPointerLock?.(false);
    document.exitPointerLock?.();
    this._searchInput?.focus?.();
    return true;
  }

  close() {
    if (!this.root) return false;
    this._open = false;
    this.root.classList.remove("mt-open");
    this.tooltips?.hide?.();
    this.keybinds.guiOpen = false;
    this.keybinds.cancelCapture();
    this._persistLayout();
    this.modules.game?.onGuiClosed?.();
    return false;
  }

  // -- construction ---------------------------------------------------------

  _buildWindows() {
    const cats = this.modules.populatedCategories();
    let x = 12;
    let y = 12;
    for (const cat of cats) {
      const win = this._createCategoryWindow(cat);
      this.windows.set(cat.id, win);
      // Stagger initial layout so windows do not overlap.
      win.x = x;
      win.y = y;
      y += 34;
      if (y > 260) {
        y = 12;
        x += 190;
      }
    }
    this._createSearchWindow();
    this._createConfigWindow();
  }

  /**
   * First-run layout: flow the windows into columns using their measured sizes
   * so nothing overlaps before the user drags anything. Saved layouts override
   * this in `_applyLayout()`.
   */
  _tileWindows() {
    const GAP = 8;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const maxHeight = Math.max(200, viewportHeight * 0.82);
    // Measure, then place. Reading offsetWidth forces layout once per window,
    // which is acceptable at open time and keeps the GUI tidy by default.
    let x = GAP;
    let y = GAP;
    let columnWidth = 0;
    for (const state of this.windows.values()) {
      const w = state.el.offsetWidth || 150;
      const h = state.el.offsetHeight || 120;
      if (y > GAP && y + h > maxHeight) {
        x += columnWidth + GAP;
        y = GAP;
        columnWidth = 0;
      }
      state.x = x;
      state.y = y;
      y += h + GAP;
      columnWidth = Math.max(columnWidth, w);
    }
  }

  _createCategoryWindow(cat) {
    const header = el("div", { class: "mt-header" });
    const dot = el("span", { class: "mt-cat-dot", style: { background: cat.color } });
    const title = el("span", { class: "mt-title", text: cat.label });
    const count = el("span", { class: "mt-count", text: "0" });
    const collapse = el("span", { class: "mt-collapse", text: "▾" });
    header.append(dot, title, count, collapse);

    const body = el("div", { class: "mt-body" });
    const win = el("div", { class: "mt-window", "data-category": cat.id }, [header, body]);

    const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: body, headerEl: header, countEl: count };
    this._renderCategory(cat, state);

    collapse.addEventListener("click", (e) => {
      e.stopPropagation();
      state.expanded = !state.expanded;
      body.style.display = state.expanded ? "block" : "none";
      collapse.textContent = state.expanded ? "▾" : "▸";
      this._persistLayout();
    });
    header.addEventListener("mousedown", (e) => this._beginDrag(e, state));
    // Block the wheel from reaching the game while hovering a window.
    body.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    win.addEventListener("contextmenu", (e) => e.preventDefault());

    this.root.appendChild(win);
    return state;
  }

  _renderCategory(cat, state) {
    const body = state.bodyEl;
    this._disposeSettings(body);
    body.textContent = "";
    const list = this.modules.byCategory(cat.id);
    state.countEl.textContent = String(list.length);
    // Render the enabled modules first — the useful ones float to the top.
    const sorted = [...list].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    for (const mod of sorted) {
      body.appendChild(this._createModuleRow(mod));
    }
  }

  _createModuleRow(mod) {
    const rowEl = el("div", { class: "mt-row" });
    const name = el("span", { class: "mt-name", text: mod.name });
    const fav = el("span", { class: "mt-fav", text: "★", title: "favourite" });
    fav.style.visibility = this.modules.isFavourite(mod) ? "visible" : "hidden";
    const bind = el("span", { class: "mt-bind", text: mod.bind.value ? `[${mod.bindDescription}]` : "" });
    rowEl.append(fav, name, bind);

    const settingsWrap = el("div", { class: "mt-expand mt-hidden" });
    const container = el("div", { class: "mt-module" }, [rowEl, settingsWrap]);

    const refresh = () => {
      rowEl.classList.toggle("mt-on", mod.active);
      rowEl.classList.toggle("mt-unsupported", !mod.canEnable() && !mod.active);
      bind.textContent = mod.bind.value ? `[${mod.bindDescription}]` : "";
      fav.style.visibility = this.modules.isFavourite(mod) ? "visible" : "hidden";
      const reason = mod.ineligibilityReason();
      rowEl.title = reason ? `${mod.description}\n⚠ ${reason}` : mod.description;
    };
    refresh();

    rowEl.addEventListener("mouseenter", (e) =>
      this.tooltips?.show?.(e.currentTarget, {
        title: `${mod.name}  ·  ${mod.category}`,
        body: `${mod.description}${mod.unsupported ? `\n\nUNSUPPORTED: ${mod.unsupportedReason}` : ""}${mod.ineligibilityReason() ? `\n\ncurrently unavailable: ${mod.ineligibilityReason()}` : ""}`,
      }),
    );
    rowEl.addEventListener("mouseleave", () => this.tooltips?.hide?.());

    // left click = toggle
    rowEl.addEventListener("click", (e) => {
      if (e.target === fav) return;
      e.stopPropagation();
      if (mod.unsupported) {
        this.notify(`${mod.name} is not supported on this runtime`, "warn");
        return;
      }
      mod.toggle();
      refresh();
    });
    // middle click = favourite
    rowEl.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.modules.toggleFavourite(mod);
        refresh();
      }
    });
    // right click = expand settings
    rowEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const showExpand = settingsWrap.classList.toggle("mt-hidden");
      if (!showExpand) settingsWrap.classList.remove("mt-hidden");
      if (settingsWrap.dataset.built !== "1") {
        this._buildSettings(mod, settingsWrap, refresh);
        settingsWrap.dataset.built = "1";
      }
    });

    return container;
  }

  _disposeSettings(root) {
    if (!root) return;
    for (const node of [root, ...root.querySelectorAll("*")]) {
      for (const dispose of node._settingDisposers ?? []) dispose();
      delete node._settingDisposers;
    }
  }

  _buildSettings(mod, wrap, refresh) {
    this._disposeSettings(wrap);
    wrap._settingDisposers = [];
    const ctx = {
      onDispose: (dispose) => wrap._settingDisposers.push(dispose),
      theme: this.theme,
      keybinds: this.keybinds,
      tooltips: this.tooltips,
      onChange: (s) => {
        refresh();
        this.config?.save?.(false);
      },
    };
    // The module bind gets its own row so it is always visible.
    wrap.appendChild(createGroupWidget(mod.settings.defaultGroup, ctx));
    for (const group of mod.settings.groups) {
      if (group === mod.settings.defaultGroup) continue;
      if (group.settings.length === 0) continue;
      wrap.appendChild(createGroupWidget(group, ctx));
    }
    for (const line of mod.statusLines()) {
      wrap.appendChild(
        el("div", { class: "mt-setting" }, [
          el("label", { text: line.label }),
          el("span", { text: line.value, style: { color: "var(--mt-warn)" } }),
        ]),
      );
    }
    const actions = el("div", { style: { display: "flex", gap: "6px", marginTop: "6px" } });
    const resetBtn = el("button", { class: "mt-btn", text: "Reset settings" });
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mod.settings.reset();
      wrap.textContent = "";
      this._buildSettings(mod, wrap, refresh);
      this.config?.save?.(true);
      refresh();
    });
    actions.appendChild(resetBtn);
    if (mod.unsupported) {
      actions.appendChild(el("span", { text: mod.unsupportedReason, style: { color: "var(--mt-warn)", alignSelf: "center" } }));
    }
    wrap.appendChild(actions);
  }

  _createSearchWindow() {
    const header = el("div", { class: "mt-header" }, [
      el("span", { class: "mt-cat-dot", style: { background: "var(--mt-accent)" } }),
      el("span", { class: "mt-title", text: "Search" }),
      el("span", { class: "mt-count", text: "" }),
    ]);
    this._searchInput = el("input", {
      class: "mt-search",
      type: "text",
      placeholder: "search modules (name or description)…",
      "aria-label": "Search modules",
    });
    const results = el("div", { class: "mt-body" });
    const body = el("div", { style: { padding: "6px" } }, [this._searchInput, results]);
    const win = el("div", { class: "mt-window mt-search-win" }, [header, body]);
    const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: results, headerEl: header, isSearch: true };
    header.addEventListener("mousedown", (e) => this._beginDrag(e, state));

    const run = () => {
      const q = this._searchInput.value;
      this.searchQuery = q;
      this._disposeSettings(results);
      results.textContent = "";
      if (!q.trim()) {
        results.appendChild(el("div", { style: { color: "var(--mt-text-muted)", padding: "4px" } }, ["type to filter…"]));
        return;
      }
      const found = this.modules.search(q);
      if (found.length === 0) {
        results.appendChild(el("div", { style: { color: "var(--mt-text-muted)", padding: "4px" } }, ["no matches"]));
        return;
      }
      for (const mod of found) {
        const r = el("div", { class: `mt-row${mod.active ? " mt-on" : ""}` }, [
          el("span", { class: "mt-name", text: `${mod.name}` }),
          el("span", { class: "mt-bind", text: mod.category }),
        ]);
        r.addEventListener("click", (e) => {
          e.stopPropagation();
          mod.toggle();
          run();
        });
        results.appendChild(r);
      }
    };
    this._searchInput.addEventListener("input", run);
    this._searchInput.addEventListener("keydown", (e) => e.stopPropagation());
    run();
    this.root.appendChild(win);
    this.searchState = state;
    this.windows.set("__search__", state);
  }

  _createConfigWindow() {
    const header = el("div", { class: "mt-header" }, [
      el("span", { class: "mt-cat-dot", style: { background: "#8d8d8d" } }),
      el("span", { class: "mt-title", text: "Config" }),
      el("span", { class: "mt-count", text: "" }),
    ]);
    const body = el("div", { style: { padding: "8px", display: "flex", flexDirection: "column", gap: "6px" } });
    const win = el("div", { class: "mt-window mt-config-win" }, [header, body]);
    const state = { el: win, x: 12, y: 12, expanded: true, bodyEl: body, headerEl: header, isConfig: true };
    header.addEventListener("mousedown", (e) => this._beginDrag(e, state));

    const btn = (label, fn, primary) => {
      const b = el("button", { class: `mt-btn${primary ? " mt-primary" : ""}`, text: label });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        fn();
      });
      return b;
    };

    body.appendChild(
      el("div", { style: { color: "var(--mt-text-dim)" } }, [`profile: ${this.config?.activeProfile ?? "default"}`]),
    );
    body.appendChild(btn("Save configuration", () => this.config?.save(true), true));
    body.appendChild(btn("Reset everything", () => this.config?.resetAll?.()));
    body.appendChild(btn("Export (copy)", () => this._exportToClipboard()));
    const importField = el("textarea", {
      class: "mt-search",
      rows: "2",
      placeholder: "paste exported config here to import",
    });
    importField.addEventListener("keydown", (e) => e.stopPropagation());
    body.appendChild(importField);
    body.appendChild(
      btn("Import from box", () => {
        const res = this.config?.importProfile?.(importField.value);
        this.notify(res?.ok ? "imported" : `import failed: ${res?.errors?.join(", ")}`, res?.ok ? "info" : "error");
        if (res?.ok) {
          this.refreshAll();
          importField.value = "";
        }
      }),
    );
    if (this.hudEditor) {
      body.appendChild(btn("Edit HUD layout", () => this.hudEditor.setEditing(true)));
    }
    // Profile management
    const profiles = this.config?.listProfiles?.() ?? ["default"];
    const select = el("select", {});
    for (const p of profiles) {
      const o = el("option", { value: p, text: p });
      if (p === this.config?.activeProfile) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener("change", () => {
      this.config?.switchProfile?.(select.value, { saveCurrent: true });
      this.refreshAll();
    });
    body.appendChild(el("div", { style: { color: "var(--mt-text-dim)" } }, ["profile"]));
    body.appendChild(select);
    const nameField = el("input", { type: "text", class: "mt-search", placeholder: "new profile name" });
    nameField.addEventListener("keydown", (e) => e.stopPropagation());
    body.appendChild(nameField);
    body.appendChild(
      btn("Create + switch", () => {
        const name = nameField.value;
        if (this.config?.createProfile?.(name)) {
          this.config.switchProfile(name, { saveCurrent: true });
          this.notify(`created profile '${name}'`, "info");
          this.refreshAll();
        } else {
          this.notify("invalid or duplicate profile name", "warn");
        }
      }),
    );
    body.appendChild(
      btn("Delete current profile", () => {
        const cur = this.config?.activeProfile;
        if (cur && cur !== "default" && this.config.deleteProfile(cur)) {
          this.notify(`deleted profile '${cur}'`, "info");
          this.refreshAll();
        } else {
          this.notify("cannot delete the default profile", "warn");
        }
      }),
    );

    this.root.appendChild(win);
    this.configState = state;
    this.windows.set("__config__", state);
  }

  _exportToClipboard() {
    const text = this.config?.exportProfile?.() ?? "";
    const done = () => this.notify("config copied to clipboard", "info");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => this.notify("clipboard unavailable — see Config window export", "warn"));
    } else {
      this.notify("clipboard unavailable in this browser", "warn");
    }
  }

  // -- layout / drag --------------------------------------------------------

  _installGlobalHandlers() {
    this._onMove = (e) => {
      if (!this._dragState) return;
      const dx = (e.clientX - this._dragState.startX) / this.theme.scale;
      const dy = (e.clientY - this._dragState.startY) / this.theme.scale;
      this._dragState.state.x = Math.max(0, this._dragState.origX + dx);
      this._dragState.state.y = Math.max(0, this._dragState.origY + dy);
      this._positionWindow(this._dragState.state);
    };
    this._onUp = () => {
      if (!this._dragState) return;
      this._dragState.state.el.classList.remove("mt-dragging");
      this._dragState = null;
      this._persistLayout();
    };
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
    this._onResize = () => this._clampWindows();
    window.addEventListener("resize", this._onResize);
  }

  _beginDrag(e, state) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    state.el.classList.add("mt-dragging");
    state.el.style.zIndex = String(++_zCounter);
    this._dragState = { state, startX: e.clientX, startY: e.clientY, origX: state.x, origY: state.y };
  }

  _positionWindow(state) {
    state.el.style.left = `${state.x}px`;
    state.el.style.top = `${state.y}px`;
    // Scale is applied with a transform so text stays crisp and layout maths
    // stays in unscaled pixels.
    state.el.style.transform = this.theme.scale === 1 ? "" : `scale(${this.theme.scale})`;
    state.el.style.transformOrigin = "top left";
  }

  _applyLayout() {
    this._loadLayoutOnce();
    for (const [id, state] of this.windows) {
      const saved = this.layout.get(id);
      if (saved) {
        state.x = saved.x;
        state.y = saved.y;
        if (state.expanded !== saved.expanded) {
          state.expanded = saved.expanded;
          state.bodyEl.style.display = saved.expanded ? "block" : "none";
          const col = state.headerEl.querySelector(".mt-collapse");
          if (col) col.textContent = saved.expanded ? "▾" : "▸";
        }
      }
      this._positionWindow(state);
    }
    this._clampWindows();
  }

  _clampWindows() {
    const maxX = window.innerWidth / this.theme.scale - 60;
    const maxY = window.innerHeight / this.theme.scale - 30;
    for (const state of this.windows.values()) {
      let changed = false;
      if (state.x > maxX) {
        state.x = Math.max(0, maxX);
        changed = true;
      }
      if (state.y > maxY) {
        state.y = Math.max(0, maxY);
        changed = true;
      }
      if (changed) this._positionWindow(state);
    }
  }

  _loadLayoutOnce() {
    if (this._layoutLoaded) return;
    this._layoutLoaded = true;
    // `layout` is filled by the HUD/theme config system before first open.
  }

  /** Called by the config system with saved layout. */
  loadLayout(map) {
    if (!map || typeof map !== "object") return;
    this.layout = new Map(Object.entries(map));
    for (const [id, state] of this.windows) {
      const saved = this.layout.get(id);
      if (!saved) continue;
      state.x = Number(saved.x) || 0;
      state.y = Number(saved.y) || 0;
      if (typeof saved.expanded === "boolean") state.expanded = saved.expanded;
    }
    this._layoutLoaded = true;
  }

  serialiseLayout() {
    const out = {};
    for (const [id, state] of this.windows) {
      out[id] = { x: Math.round(state.x), y: Math.round(state.y), expanded: state.expanded };
    }
    return out;
  }

  _persistLayout() {
    this.layout = new Map(Object.entries(this.serialiseLayout()));
    this.config?.save?.(false);
  }

  /** Rebuild every window (after an import or profile switch). */
  refreshAll() {
    if (!this.root) return;
    for (const cat of this.modules.populatedCategories()) {
      const state = this.windows.get(cat.id);
      if (state) this._renderCategory(cat, state);
    }
    if (this._searchInput) {
      this._searchInput.value = "";
      this._searchInput.dispatchEvent(new Event("input"));
    }
  }

  dispose() {
    this._disposeSettings(this.root);
    window.removeEventListener("mousemove", this._onMove);
    window.removeEventListener("mouseup", this._onUp);
    window.removeEventListener("resize", this._onResize);
    this.root?.remove();
    this.tooltipEl?.remove();
    this.toastWrap?.remove();
    this.root = null;
  }
}

let _zCounter = 100;

/**
 * Tooltip + toast helpers (Meteor's notifications/HUD messages).
 */
export class Tooltips {
  constructor(getEl) {
    this.getEl = getEl;
  }
  show(anchor, { title, body } = {}) {
    const node = this.getEl();
    if (!node) return;
    node.textContent = "";
    if (title) node.appendChild(el("div", { class: "mt-tt-title", text: title }));
    if (body) node.appendChild(el("div", { text: body }));
    node.classList.remove("mt-hidden");
    const rect = anchor.getBoundingClientRect();
    const nw = node.offsetWidth || 200;
    let x = rect.right + 8;
    if (x + nw > window.innerWidth) x = Math.max(4, rect.left - nw - 8);
    node.style.left = `${x}px`;
    node.style.top = `${Math.min(rect.top, window.innerHeight - 80)}px`;
  }
  hide() {
    this.getEl()?.classList.add("mt-hidden");
  }
}

export class Toasts {
  constructor(getWrap, max = 5) {
    this.getWrap = getWrap;
    this.max = max;
  }
  push(text, level = "info") {
    const wrap = this.getWrap();
    if (!wrap) return;
    const t = el("div", { class: `mt-toast${level !== "info" ? ` mt-${level}` : ""}`, text });
    wrap.appendChild(t);
    while (wrap.children.length > this.max) wrap.removeChild(wrap.firstChild);
    setTimeout(() => t.remove(), 3200);
  }
}
