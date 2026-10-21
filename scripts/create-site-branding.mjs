import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import sharp from "sharp";

const parrot = await readFile("public/birds/parrot.svg");
await mkdir("public/social", { recursive: true });
await copyFile("public/birds/parrot.svg", "src/app/icon.svg");
await sharp(parrot)
  .resize(180, 180, { fit: "contain", background: "#11150e" })
  .png()
  .toFile("src/app/apple-icon.png");
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(parrot)
      .resize(size, size, { fit: "contain", background: "#11150e" })
      .png()
      .toBuffer(),
  ),
);
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
pngs.forEach((png, index) => {
  const position = 6 + index * 16;
  directory[position] = sizes[index];
  directory[position + 1] = sizes[index];
  directory.writeUInt16LE(1, position + 4);
  directory.writeUInt16LE(32, position + 6);
  directory.writeUInt32LE(png.length, position + 8);
  directory.writeUInt32LE(offset, position + 12);
  offset += png.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([directory, ...pngs]));
const parrotContent = parrot
  .toString()
  .replace(/^.*?<g /s, "<g ")
  .replace(/<\/svg>\s*$/, "");
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#080808"/><rect x="38" y="38" width="1124" height="554" rx="20" fill="#11150e" stroke="#304326"/><text x="86" y="115" fill="#a8ff57" font-family="Arial,sans-serif" font-size="21" letter-spacing="4">AUDITAI / PIP</text><text x="86" y="248" fill="#f0ede8" font-family="Georgia,serif" font-size="70">Free SEO help.</text><text x="86" y="332" fill="#a8ff57" font-family="Georgia,serif" font-size="70">One page at a time.</text><text x="88" y="422" fill="#c1c8b9" font-family="Arial,sans-serif" font-size="24">Clear evidence. Useful fixes. A little room to grow.</text><text x="88" y="525" fill="#c1c8b9" font-family="Arial,sans-serif" font-size="20">No signup. No payment. No API keys.</text><g transform="translate(814 184) scale(1.3)">${parrotContent}</g></svg>`;
await sharp(Buffer.from(social)).png().toFile("public/social/pip-preview.png");
console.log(
  "Created Pip SVG favicon, multi-size ICO, Apple icon, and 1200×630 sharing image.",
);
