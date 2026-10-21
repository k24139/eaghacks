process.env.QA_ROOT='input/phase14';
process.env.QA_MODULE_CHECKS='./phase14-acceptance.mjs';
await import('./phase13_1-gameplay-check.mjs');
