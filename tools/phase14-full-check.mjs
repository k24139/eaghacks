process.env.QA_ROOT='input/phase14/full';
process.env.QA_MANIFEST='reports/release-phase14/artifact-manifest.json';
process.env.QA_EXTRA_CHECKS='./phase14-falling-check.mjs';
process.env.QA_ORIGIN_SETTLE_MS='12000';
process.env.QA_FOOD_SETUP_ATTEMPTS='3';
process.env.QA_RESTORE_MOVEMENT_CONDITION='1';
await import('./phase13-gameplay-check.mjs');
