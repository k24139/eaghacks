/**
 * Built-in module registry. One factory so the client, the test-suite and the
 * docs generator all see exactly the same set.
 */
import { createCombatModules } from "./combat-modules.js";
import { createMovementModules } from "./movement-modules.js";
import { createRenderModules } from "./render-modules.js";
import { createWorldModules } from "./world-modules.js";
import { createMiscModules } from "./misc-modules.js";
import { createHudModules } from "./hud-modules.js";

export function createAllModules() {
  return [
    ...createCombatModules(),
    ...createMovementModules(),
    ...createRenderModules(),
    ...createWorldModules(),
    ...createMiscModules(),
    ...createHudModules(),
  ];
}
