/** Bind immutable payload verification plus identities of the acceptance tooling. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const artifact='input/phase15/Eaglercraft-26.2-u1-Eaghacks-RC4.html',output='reports/release-phase15/artifact-manifest.json';
process.argv=[process.argv[0],process.argv[1],artifact,'input/phase8/native-fixed.html',output];
await import('./phase13-manifest.mjs');
const manifest=JSON.parse(await readFile(output,'utf8'));
manifest.candidateStatus='pending acceptance; independent final QA required';
manifest.verificationTools={};
for(const name of ['phase15-manifest.mjs','phase15-full-check.mjs','phase15-acceptance.mjs','phase15-transition-checks.mjs','phase15-transition-check.mjs','phase15-gui-checks.mjs','phase15-lan-check.mjs','phase15-report.mjs','phase15-publication.py','browser-check.mjs','smoke.mjs','phase13-manifest.mjs','phase5-benchmark.mjs','phase5-present-sampler.mjs','sample-client-performance.mjs','performance-host-guard.mjs','dom-env.mjs','serve.mjs','phase7-audio-probe.js','phase13-gameplay-check.mjs','phase13-extra-checks.mjs','phase13-module-checks.mjs','phase13_1-gameplay-check.mjs','phase13_1-module-checks.mjs','phase13_1-restart-check.mjs'])manifest.verificationTools[`tools/${name}`]=createHash('sha256').update(await readFile(`tools/${name}`)).digest('hex');
manifest.regressionTests={};
for(const path of ['tests/phase15-input.test.mjs','tests/native-bridge.test.mjs'])manifest.regressionTests[path]=createHash('sha256').update(await readFile(path)).digest('hex');
manifest.localTestInfrastructure={};
for(const path of ['input/phase7/lan-server.mjs','input/phase7/lan-discovery.js'])manifest.localTestInfrastructure[path]=createHash('sha256').update(await readFile(path)).digest('hex');
await writeFile(output,JSON.stringify(manifest,null,2)+'\n');
