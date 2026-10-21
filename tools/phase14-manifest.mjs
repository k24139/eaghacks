/** Bind immutable payload verification plus identities of the acceptance tooling. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const artifact='input/phase14/Eaglercraft-26.2-u1-Eaghacks-RC3.html',output='reports/release-phase14/artifact-manifest.json';
process.argv=[process.argv[0],process.argv[1],artifact,'input/phase8/native-fixed.html',output];
await import('./phase13-manifest.mjs');
const manifest=JSON.parse(await readFile(output,'utf8'));
manifest.candidateStatus='experimental; not final-release ready';
manifest.verificationTools={};
for(const name of ['phase14-manifest.mjs','phase14-gameplay-check.mjs','phase14-mechanics-checks.mjs','phase14-acceptance.mjs','phase14-full-check.mjs','phase14-falling-check.mjs','phase14-restart-check.mjs','phase14-report.mjs','phase14-publication.py','phase13-gameplay-check.mjs','phase13-extra-checks.mjs','phase13-module-checks.mjs','phase13_1-gameplay-check.mjs','phase13_1-module-checks.mjs','phase13_1-restart-check.mjs'])manifest.verificationTools[`tools/${name}`]=createHash('sha256').update(await readFile(`tools/${name}`)).digest('hex');
await writeFile(output,JSON.stringify(manifest,null,2)+'\n');
