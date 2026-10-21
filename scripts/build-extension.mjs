import { build } from "esbuild";
import sharp from "sharp";
import { zipSync } from "fflate";
import { mkdir, readFile, writeFile, cp, readdir } from "node:fs/promises";
import path from "node:path";

const destination = "extension/dist";
await mkdir(`${destination}/icons`, { recursive: true });
await Promise.all([
  build({
    entryPoints: ["extension/panel.ts", "extension/background.ts"],
    outdir: destination,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    minify: true,
  }),
  cp("public/birds", `${destination}/birds`, { recursive: true }),
  ...["manifest.json", "panel.html", "privacy.html"].map((file) =>
    cp(`extension/${file}`, `${destination}/${file}`),
  ),
  cp("src/shared/seo/assistant.css", `${destination}/assistant.css`),
  ...[16, 32, 48, 128].map(async (size) => {
    const svg = await readFile("public/birds/parrot.svg");
    await sharp(svg)
      .resize(size, size, { fit: "contain", background: "#111111" })
      .png()
      .toFile(`${destination}/icons/${size}.png`);
  }),
]);
const files = {};
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(full);
    else
      files[path.relative(destination, full).replaceAll("\\", "/")] =
        new Uint8Array(await readFile(full));
  }
}
await collect(destination);
await mkdir("public/downloads", { recursive: true });
await writeFile(
  "public/downloads/auditai-pip.zip",
  zipSync(files, { level: 9 }),
);
console.log(
  `Built Chrome extension and installable ZIP (${Object.keys(files).length} files).`,
);
