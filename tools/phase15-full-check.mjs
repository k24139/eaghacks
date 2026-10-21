/** Final candidate regression: existing gameplay, GUI, focused modules and real restart drivers. */
process.env.QA_ROOT='input/phase15/full';
process.env.QA_MANIFEST='reports/release-phase15/artifact-manifest.json';
process.env.QA_EXTRA_CHECKS='./phase15-acceptance.mjs';
process.env.QA_ORIGIN_SETTLE_MS='12000';
process.env.QA_FOOD_SETUP_ATTEMPTS='3';
process.env.QA_RESTORE_MOVEMENT_CONDITION='1';
await import('./phase13-gameplay-check.mjs');
process.env.QA_ROOT='input/phase15/gui';
process.env.QA_MODULE_CHECKS='./phase15-gui-checks.mjs';
// The GUI driver takes a local artifact path rather than a file URL.
process.argv[2]=(await import('node:url')).fileURLToPath(process.argv[2]);
await import('./phase13_1-gameplay-check.mjs');
process.argv[2]=(await import('node:url')).pathToFileURL((await import('node:path')).resolve(process.argv[2])).href;
process.env.QA_COMBAT_PERSISTENCE='1';
await import('./phase13_1-restart-check.mjs');
