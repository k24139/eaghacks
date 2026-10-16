/**
 * Public entry point.
 *
 * `bootMeteor()` is what an Eaglercraft integration calls once the game runtime
 * is available:
 *
 *   const client = Meteor.bootMeteor({ adapter: createEaglercraftAdapter(game) });
 *
 * Nothing here reaches into game internals; the adapter is supplied by the
 * integration layer.
 */
import { MeteorClient } from "./core/meteor.js";
import { EventBus, Events, CancellableEvent, Subscription, SubscriptionBag } from "./core/event-bus.js";
import { Module } from "./core/module.js";
import { ModuleManager, CATEGORIES } from "./core/module-manager.js";
import { Settings, SettingGroup, Setting, BoolSetting, IntSetting, DoubleSetting, StringSetting, EnumSetting, ColorSetting, KeybindSetting } from "./core/settings.js";
import { ConfigManager, CONFIG_VERSION } from "./core/config-manager.js";
import { KeybindManager } from "./core/keybind-manager.js";
import { Stats, Ticker } from "./core/stats.js";
import { GameAdapter, NullAdapter, MockAdapter, CAPABILITIES } from "./core/adapter.js";
import { Theme, DEFAULT_THEME } from "./gui/theme.js";
import { ClickGUI, Tooltips, Toasts } from "./gui/clickgui.js";
import { HUDManager } from "./gui/hud.js";
import { createSettingWidget, createGroupWidget } from "./gui/widgets.js";
import { createAllModules } from "./modules/index.js";

let instance = null;

/**
 * Create and start a client. Returns the singleton unless `fresh` is set.
 * @param {object} [options]
 */
export function bootMeteor(options = {}) {
  if (instance && !options.fresh) return instance;
  if (instance) shutdownMeteor();
  const client = new MeteorClient(options);
  client.init();
  client.start();
  instance = client;
  return client;
}

export function getMeteor() {
  return instance;
}

export function shutdownMeteor() {
  instance?.stop();
  instance = null;
}

export {
  MeteorClient,
  EventBus,
  Events,
  CancellableEvent,
  Subscription,
  SubscriptionBag,
  Module,
  ModuleManager,
  CATEGORIES,
  Settings,
  SettingGroup,
  Setting,
  BoolSetting,
  IntSetting,
  DoubleSetting,
  StringSetting,
  EnumSetting,
  ColorSetting,
  KeybindSetting,
  ConfigManager,
  CONFIG_VERSION,
  KeybindManager,
  Stats,
  Ticker,
  GameAdapter,
  NullAdapter,
  MockAdapter,
  CAPABILITIES,
  Theme,
  DEFAULT_THEME,
  ClickGUI,
  Tooltips,
  Toasts,
  HUDManager,
  createSettingWidget,
  createGroupWidget,
  createAllModules,
};

/** Convenience global for the standalone HTML build. */
if (typeof window !== "undefined") {
  window.Meteor = window.Meteor ?? {};
  Object.assign(window.Meteor, {
    boot: bootMeteor,
    get: getMeteor,
    shutdown: shutdownMeteor,
    MeteorClient,
    Events,
    Module,
    Settings,
    SettingGroup,
  });
}
