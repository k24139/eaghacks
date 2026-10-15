/**
 * Build step: bundle the framework into one self-contained IIFE that can be
 * dropped into the Eaglercraft client HTML with a <script> tag.
 *
 * The output is deliberately dependency-free at runtime — esbuild is a
 * build-time tool only, which satisfies "no external dependencies that prevent
 * the final HTML from working standalone".
 */
import { build } from "esbuild";
import { mkdirSync, statSync } from "node:fs";

const outfile = "dist/meteor.bundle.js";
mkdirSync("dist", { recursive: true });

const result = await build({
  entryPoints: ["src/index.js"],
  outfile,
  bundle: true,
  format: "iife",
  globalName: "MeteorFramework",
  target: ["es2020"],
  legalComments: "none",
  minify: false, // readable build; the injector can minify if desired
  banner: {
    js: "/* Meteor-inspired client framework for Eaglercraft 26.2-u1 — generated bundle. */",
  },
  metafile: true,
  logLevel: "info",
});

const bytes = statSync(outfile).size;
const inputs = Object.keys(result.metafile.inputs).length;
console.log(`built ${outfile} (${(bytes / 1024).toFixed(1)} KiB from ${inputs} modules)`);
