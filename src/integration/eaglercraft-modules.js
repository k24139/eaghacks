import { createAllModules } from '../modules/index.js';

export function createEaglercraftModules() {
  const modules = createAllModules();
  for (const id of ['auto-clicker', 'auto-walk', 'sprint']) {
    const module = modules.find((m) => m.id === id);
    if (module) {
      module.requiredCapabilities = ['input'];
      module.runsInMenus = true;
    }
  }

  const sprint = modules.find((m) => m.id === 'sprint');
  if (sprint) {
    sprint.onEnable = function () { this._original = this.game.getPlayer?.()?.sprinting ?? false; };
    sprint.onTick = function () {
      const onlyForward = this.settings.get('only-forward')?.value !== false;
      const held = this.manager.client?.keybinds?.heldKeys;
      const player=this.game.getPlayer?.(), hungerAllowed=typeof player?.hunger!=='number'||player.hunger>=this.settings.get('min-hunger').value;
      this.game.setSprinting?.(hungerAllowed && (!onlyForward || !!held?.has('KeyW')));
    };
    sprint.onDisable = function () { this.game.setSprinting?.(this.settings.get('restore').value ? !!this._original : false); };
  }

  // Real world reads do not imply every renderer/camera action is writable.
  for (const [id, capability] of [
    ['fullbright', 'brightness-control'],
    ['zoom', 'fov-control'],
    ['no-hurt-cam', 'hurt-camera-control'],
  ]) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['world', capability];
  }

  // Read-only item metadata + verified selected-slot/use-item actions satisfy
  // these modules without enabling the broad inventory mutation contract.
  for (const id of ['armor-hud', 'durability-warnings']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['native-inventory-read'];
  }
  const autoEat = modules.find((m) => m.id === 'auto-eat');
  if (autoEat) autoEat.requiredCapabilities = ['world', 'native-inventory-read', 'native-direct'];

  const autoRespawn=modules.find(m=>m.id==='auto-respawn');
  if(autoRespawn)autoRespawn.requiredCapabilities=['native-respawn'];
  const crosshair=modules.find(m=>m.id==='custom-crosshair');
  if(crosshair){const base=crosshair.ineligibilityReason.bind(crosshair);crosshair.ineligibilityReason=function(){return base()||(this.settings.get('hide-vanilla').value&&!this.game.hasCapability('crosshair-control')?'native crosshair control unavailable; turn off Hide the game\'s own crosshair':null);};}
  const aura=modules.find(m=>m.id==='kill-aura');
  if(aura){const base=aura.ineligibilityReason.bind(aura);aura.ineligibilityReason=function(){return base()||(this.settings.get('multi').value&&!this.game.hasCapability('native-multi-attack')?'native multi-target attacks unavailable; turn off multi-target':null);};}
  for(const id of ['speed','bunny-hop','anti-afk']){const module=modules.find(m=>m.id===id);if(module){module.requiredCapabilities=['world','native-direct'];module.localTestOnly=true;}}
  for(const[id,capability]of [['freecam','camera-detach'],['potion-hud','effects'],['biome-info','biome'],['reach-display','combat-events'],['waypoints','world-identity']]){const module=modules.find(m=>m.id===id);if(module)module.requiredCapabilities=[...new Set([...module.requiredCapabilities,capability])];}

  // Source-built 26.2 clients expose real entity state and direct actions.
  for (const id of ['kill-aura', 'aim-assist', 'trigger-bot', 'auto-crit']) {
    const module = modules.find((m) => m.id === id);
    if (module) module.requiredCapabilities = ['world', 'entities', 'native-direct'];
  }

  const autoWalk = modules.find((m) => m.id === 'auto-walk');
  if (autoWalk) {
    autoWalk.localTestOnly = true;
    autoWalk.onEnable = () => {};
  }
  // Retain the saved options while making absent native contracts explicit.
  for (const [id, setting, reason] of [
    ['fullbright', 'night-vision', 'native effect mutation is not exposed; brightness still works'],
    ['no-hurt-cam', 'tilt', 'independent directional tilt is not exposed; whole hurt camera suppression still works'],
    ['target-hud', 'armor', 'target armor metadata is not published'],
  ]) {
    const module = modules.find(m => m.id === id);
    // Settings initialise on registration, so apply metadata after onInit.
    const init = module.onInit;
    module.onInit = function () { init.call(this); this.settings.get(setting).unavailableReason = reason; };
  }
  return modules;
}

