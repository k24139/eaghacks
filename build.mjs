/**
 * Build both public browser bundles:
 *  - dist/meteor.bundle.js: reusable framework global (MeteorFramework)
 *  - dist/eaghacks-integration.js: Eaglercraft-specific self-starting integration
 *
 * Both outputs are dependency-free at runtime; esbuild is build-time only.
 */
import { build } from "esbuild";
import { mkdirSync, statSync } from "node:fs";

mkdirSync("dist", { recursive: true });

async function bundle({ entryPoint, outfile, globalName, banner }) {
  const result = await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: "iife",
    ...(globalName ? { globalName } : {}),
    target: ["es2020"],
    platform: "browser",
    legalComments: "none",
    minify: false,
    banner: { js: banner },
    metafile: true,
    logLevel: "info",
  });
  const bytes = statSync(outfile).size;
  const inputs = Object.keys(result.metafile.inputs).length;
  console.log(`built ${outfile} (${(bytes / 1024).toFixed(1)} KiB from ${inputs} modules)`);
}

await bundle({
  entryPoint: "src/index.js",
  outfile: "dist/meteor.bundle.js",
  globalName: "MeteorFramework",
  banner: "/* Meteor-inspired client framework for Eaglercraft 26.2-u1 — generated bundle. */",
});

await bundle({
  entryPoint: "src/integration/bootstrap.js",
  outfile: "dist/eaghacks-integration.js",
  banner: "/* EaglerHacks Eaglercraft 26.2-u1 integration — generated bundle. */",
});
