/**
 * Setting widget factory, equivalent to Meteor's `DefaultSettingsWidgetFactory`.
 * Maps a Setting instance to a DOM control. Content is built once and updated
 * in place, so re-rendering a module does not thrash the DOM.
 */
import { el } from "./theme.js";
import {
  BoolSetting,
  IntSetting,
  DoubleSetting,
  StringSetting,
  EnumSetting,
  ColorSetting,
  KeybindSetting,
  describeKeybind,
} from "../core/settings.js";

/**
 * @param {import('../core/settings.js').Setting} setting
 * @param {object} ctx  { theme, keybinds, onChange, tooltips }
 * @returns {HTMLElement|null}
 */
export function createSettingWidget(setting, ctx) {
  if (setting.unavailableReason) {
    const control = el("span", { text: `Unavailable: ${setting.unavailableReason}` });
    const widget = row(displayName(setting), control, setting, ctx);
    widget.setAttribute("aria-disabled", "true");
    widget.title = setting.unavailableReason;
    return widget;
  }
  if (setting instanceof BoolSetting) return boolWidget(setting, ctx);
  if (setting instanceof IntSetting) return numberWidget(setting, ctx, true);
  if (setting instanceof DoubleSetting) return numberWidget(setting, ctx, false);
  if (setting instanceof StringSetting) return stringWidget(setting, ctx);
  if (setting instanceof EnumSetting) return enumWidget(setting, ctx);
  if (setting instanceof ColorSetting) return colorWidget(setting, ctx);
  if (setting instanceof KeybindSetting) return keybindWidget(setting, ctx);
  return null;
}

function observe(setting, ctx, listener) {
  setting.onChanged(listener);
  ctx?.onDispose?.(() => setting.offChanged(listener));
}

function row(label, control, setting, ctx) {
  const r = el("div", { class: "mt-setting" }, [el("label", { text: label, title: setting.description || label }), control]);
  attachTooltip(r, setting, ctx);
  return r;
}

export function attachTooltip(node, setting, ctx) {
  if (!ctx?.tooltips) return;
  node.addEventListener("mouseenter", (e) =>
    ctx.tooltips.show(e.currentTarget, {
      title: setting.name,
      body: setting.description || "(no description)",
    }),
  );
  node.addEventListener("mouseleave", () => ctx.tooltips.hide());
}

// -- widgets ----------------------------------------------------------------

function boolWidget(setting, ctx) {
  const box = el("span", { class: `mt-check${setting.value ? " mt-checked" : ""}` });
  const control = el("div", { class: "mt-bool", style: { display: "flex", alignItems: "center" } }, [box]);
  const update = () => {
    box.classList.toggle("mt-checked", !!setting.value);
  };
  observe(setting, ctx, update);
  const toggle = () => {
    setting.set(!setting.value);
    update();
    ctx?.onChange?.(setting);
  };
  control.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  return row(displayName(setting), control, setting, ctx);
}

function numberWidget(setting, ctx, isInt) {
  const isSlider = setting.slider && Number.isFinite(setting.min) && Number.isFinite(setting.max);
  const num = el("span", { class: "mt-num", text: formatNumber(setting.value, isInt) });
  const children = [];
  if (isSlider) {
    const input = el("input", {
      type: "range",
      min: String(setting.min),
      max: String(setting.max),
      step: String(isInt ? (setting.step ?? 1) : Math.max(0.001, (setting.max - setting.min) / 1000)),
      value: String(setting.value),
    });
    input.addEventListener("input", () => {
      setting.set(Number(input.value));
      num.textContent = formatNumber(setting.value, isInt);
      ctx?.onChange?.(setting);
    });
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("click", (e) => e.stopPropagation());
    children.push(input);
  } else {
    const input = el("input", { type: "text", value: String(setting.value), style: { maxWidth: "70px" } });
    input.addEventListener("change", () => {
      setting.set(input.value);
      input.value = String(setting.value);
      num.textContent = formatNumber(setting.value, isInt);
      ctx?.onChange?.(setting);
    });
    children.push(input);
  }
  children.push(num);
  const control = el("div", { style: { display: "flex", alignItems: "center", gap: "6px", flex: 1 } }, children);
  observe(setting, ctx, (v) => {
    num.textContent = formatNumber(v, isInt);
    const input = control.querySelector("input");
    if (input && input.type === "range" && Number(input.value) !== v) input.value = String(v);
    if (input && input.type === "text") input.value = String(v);
  });
  return row(displayName(setting), control, setting, ctx);
}

function stringWidget(setting, ctx) {
  const input = el("input", {
    type: "text",
    value: setting.value ?? "",
    placeholder: setting.placeholder ?? "",
    style: { flex: "1" },
  });
  input.addEventListener("input", () => {
    setting.set(input.value);
    ctx?.onChange?.(setting);
  });
  // Typing must not reach the game / global keybinds.
  input.addEventListener("keydown", (e) => e.stopPropagation());
  input.addEventListener("mousedown", (e) => e.stopPropagation());
  observe(setting, ctx, (v) => {
    if (input !== document.activeElement) input.value = v ?? "";
  });
  return row(displayName(setting), input, setting, ctx);
}

function enumWidget(setting, ctx) {
  const select = el("select", { style: { maxWidth: "130px" } });
  for (const opt of setting.options) {
    const o = el("option", { value: opt, text: opt });
    if (opt === setting.value) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener("change", () => {
    setting.set(select.value);
    ctx?.onChange?.(setting);
  });
  select.addEventListener("mousedown", (e) => e.stopPropagation());
  select.addEventListener("click", (e) => e.stopPropagation());
  observe(setting, ctx, (v) => {
    if (select.value !== v) select.value = v;
  });
  return row(displayName(setting), select, setting, ctx);
}

function colorWidget(setting, ctx) {
  const swatch = el("span", { class: "mt-swatch" });
  const paint = () => {
    swatch.style.background = setting.toHex(true);
  };
  paint();
  observe(setting, ctx, paint);
  swatch.addEventListener("click", (e) => {
    e.stopPropagation();
    openColorEditor(swatch, setting, ctx, paint);
  });
  const holder = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } }, [swatch]);
  if (setting.rainbowDefault !== undefined) {
    const rb = el("span", { class: `mt-check${setting.rainbow ? " mt-checked" : ""}`, title: "rainbow" });
    rb.addEventListener("click", (e) => {
      e.stopPropagation();
      setting.rainbow = !setting.rainbow;
      rb.classList.toggle("mt-checked", setting.rainbow);
      ctx?.onChange?.(setting);
    });
    holder.appendChild(el("label", { text: "rainbow", style: { color: "var(--mt-text-muted)" } }));
    holder.appendChild(rb);
  }
  return row(displayName(setting), holder, setting, ctx);
}

/** Small popover with RGBA sliders + hex entry. */
function openColorEditor(anchor, setting, ctx, repaint) {
  document.querySelectorAll(".mt-color-editor").forEach((n) => n.remove());
  const pop = el("div", {
    class: "mt-color-editor",
    style: {
      position: "fixed",
      background: "var(--mt-panel)",
      border: "1px solid var(--mt-border)",
      borderRadius: "6px",
      padding: "8px",
      zIndex: "2147483300",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
  });
  const rect = anchor.getBoundingClientRect();
  pop.style.left = `${Math.min(rect.left, window.innerWidth - 200)}px`;
  pop.style.top = `${rect.bottom + 4}px`;

  const channels = [
    ["r", "R"],
    ["g", "G"],
    ["b", "B"],
    ["a", "A"],
  ];
  const sliders = {};
  for (const [key, label] of channels) {
    const s = el("input", { type: "range", min: "0", max: "255", value: String(setting.value[key]) });
    s.addEventListener("input", () => {
      setting.set({ ...setting.value, [key]: Number(s.value) });
      hex.value = setting.toHex(false);
      repaint();
      ctx?.onChange?.(setting);
    });
    const wrap = el("div", { style: { display: "flex", alignItems: "center", gap: "6px" } }, [
      el("span", { text: label, style: { width: "12px", color: "var(--mt-text-dim)" } }),
      s,
    ]);
    sliders[key] = s;
    pop.appendChild(wrap);
  }
  const hex = el("input", { type: "text", value: setting.toHex(false), style: { width: "90px" } });
  hex.addEventListener("change", () => {
    setting.set(hex.value);
    repaint();
    for (const [key] of channels) sliders[key].value = String(setting.value[key]);
    ctx?.onChange?.(setting);
  });
  pop.appendChild(el("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" } }, [el("span", { text: "hex", style: { color: "var(--mt-text-dim)" } }), hex]));
  pop.addEventListener("click", (e) => e.stopPropagation());
  pop.addEventListener("mousedown", (e) => e.stopPropagation());
  document.body.appendChild(pop);

  const close = (ev) => {
    if (pop.contains(ev.target)) return;
    pop.remove();
    document.removeEventListener("mousedown", close, true);
  };
  setTimeout(() => document.addEventListener("mousedown", close, true), 0);
}

function keybindWidget(setting, ctx) {
  const btn = el("button", { class: "mt-bindbtn", text: describeKeybind(setting.value) });
  const paint = () => {
    btn.textContent = ctx?.keybinds?.capturing && btn.classList.contains("mt-capturing") ? "press…" : describeKeybind(setting.value);
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!ctx?.keybinds) return;
    btn.classList.add("mt-capturing");
    btn.textContent = "press…";
    ctx.keybinds.capture((kb) => {
      btn.classList.remove("mt-capturing");
      if (kb !== null) setting.set(kb);
      paint();
      ctx?.onChange?.(setting);
    });
  });
  observe(setting, ctx, paint);
  const clear = el("span", { class: "mt-fav", text: "⨯", title: "clear bind", style: { cursor: "pointer", color: "var(--mt-text-muted)" } });
  clear.addEventListener("click", (e) => {
    e.stopPropagation();
    setting.set(null);
    paint();
    ctx?.onChange?.(setting);
  });
  const holder = el("div", { style: { display: "flex", gap: "6px", alignItems: "center" } }, [btn, clear]);
  return row(displayName(setting), holder, setting, ctx);
}

// -- group + module rendering ----------------------------------------------

/**
 * Render a SettingGroup as an expandable section.
 * @returns {HTMLElement}
 */
export function createGroupWidget(group, ctx) {
  const wrap = el("div", { class: "mt-group" });
  const title = el("div", { class: "mt-group-title", text: `${group.expanded ? "▾" : "▸"} ${group.name || "settings"}` });
  const body = el("div", {}, []);
  body.style.display = group.expanded ? "block" : "none";
  title.addEventListener("click", (e) => {
    e.stopPropagation();
    group.expanded = !group.expanded;
    title.textContent = `${group.expanded ? "▾" : "▸"} ${group.name || "settings"}`;
    body.style.display = group.expanded ? "block" : "none";
    ctx?.onChange?.(group);
  });
  wrap.appendChild(title);
  for (const s of group.settings) {
    if (!s.isVisible()) continue;
    const w = createSettingWidget(s, ctx);
    if (w) body.appendChild(w);
  }
  wrap.appendChild(body);
  return wrap;
}

function displayName(setting) {
  return setting.displayName || setting.name.replace(/[-_]/g, " ");
}

function formatNumber(v, isInt) {
  if (isInt) return String(Math.round(v));
  return String(Number(v).toFixed(2));
}
