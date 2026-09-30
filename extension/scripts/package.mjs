// Zips dist/ into release/heb-grocery-agent-v<version>.zip for the Chrome Web Store.
// Run `npm run build` first (the root `npm run package` script does both).

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const releaseDir = join(root, "..", "release");

const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
const zipPath = join(releaseDir, `heb-grocery-agent-v${manifest.version}.zip`);

if (!existsSync(join(dist, "background.js"))) {
  throw new Error("dist/ is missing build output. Run `npm run build` first.");
}

await mkdir(releaseDir, { recursive: true });
await rm(zipPath, { force: true });

// manifest.json must sit at the root of the zip, so zip from inside dist/.
execFileSync("zip", ["-r", "-X", zipPath, "."], { cwd: dist, stdio: "inherit" });
console.log(`\nCreated ${zipPath}`);
