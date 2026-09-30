// Builds the extension into dist/.
//   node scripts/build.mjs           one-off production build
//   node scripts/build.mjs --watch   rebuild on change
//
// The version in package.json is the single source of truth: it is written
// into dist/manifest.json so the two can never drift apart.

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

async function copyAssets() {
  const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  manifest.version = pkg.version;
  await writeFile(join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await cp(join(root, "popup.html"), join(dist, "popup.html"));
  await cp(join(root, "popup.css"), join(dist, "popup.css"));
  await mkdir(join(dist, "icons"));
  for (const size of [16, 48, 128]) {
    await cp(join(root, "icons", `icon${size}.png`), join(dist, "icons", `icon${size}.png`));
  }
}

const shared = {
  bundle: true,
  target: "chrome116",
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
  absWorkingDir: root,
};

const builds = [
  // Declared as a module worker in manifest.json.
  { ...shared, entryPoints: ["src/background.ts"], outfile: "dist/background.js", format: "esm" },
  // Content scripts and the panel page load as classic scripts.
  { ...shared, entryPoints: ["src/content-script.ts"], outfile: "dist/content-script.js", format: "iife" },
  { ...shared, entryPoints: ["src/popup.ts"], outfile: "dist/popup.js", format: "iife" },
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await copyAssets();

if (watch) {
  for (const options of builds) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  }
  console.log("Watching src/ for changes. Static files are copied once; restart to pick up edits to them.");
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  console.log(`Built v${pkg.version} into dist/`);
}
