// Optional dev utility — regenerates public/icons/*.png and favicon.svg.
// Not used by `npm run build`. Run once with `npm i -D sharp && node gen-icons.mjs`
// only if you want to change the app icon; the generated PNGs are already committed.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";

const BG = "#0a0a0d";
const LIME = "#c6ff3d";

// Standard icon: hanger mark, generous canvas fill.
function svgStandard(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="112" fill="${BG}"/>
    <circle cx="256" cy="128" r="22" fill="none" stroke="${LIME}" stroke-width="20"/>
    <path d="M256 150 L256 182" stroke="${LIME}" stroke-width="20" stroke-linecap="round"/>
    <path d="M256 182 L108 274 Q96 282 104 296 L118 320 Q126 332 140 326 L256 262 L372 326 Q386 332 394 320 L408 296 Q416 282 404 274 Z"
      fill="none" stroke="${LIME}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="168" y1="300" x2="344" y2="300" stroke="${LIME}" stroke-width="16" stroke-linecap="round"/>
  </svg>`;
}

// Maskable icon: same mark, shrunk + centered so OS crop masks never clip it.
function svgMaskable(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${BG}"/>
    <g transform="translate(256 256) scale(0.62) translate(-256 -256)">
      <circle cx="256" cy="128" r="22" fill="none" stroke="${LIME}" stroke-width="20"/>
      <path d="M256 150 L256 182" stroke="${LIME}" stroke-width="20" stroke-linecap="round"/>
      <path d="M256 182 L108 274 Q96 282 104 296 L118 320 Q126 332 140 326 L256 262 L372 326 Q386 332 394 320 L408 296 Q416 282 404 274 Z"
        fill="none" stroke="${LIME}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
      <line x1="168" y1="300" x2="344" y2="300" stroke="${LIME}" stroke-width="16" stroke-linecap="round"/>
    </g>
  </svg>`;
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  ["public/icons/icon-192.png", svgStandard(192), 192],
  ["public/icons/icon-512.png", svgStandard(512), 512],
  ["public/icons/icon-maskable-192.png", svgMaskable(192), 192],
  ["public/icons/icon-maskable-512.png", svgMaskable(512), 512],
  ["public/apple-touch-icon.png", svgStandard(180), 180]
];

for (const [path, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path);
  console.log("wrote", path);
}

// favicon.svg — vector, scales cleanly at any size in the browser tab.
writeFileSync("public/favicon.svg", svgStandard(64).trim());
console.log("wrote public/favicon.svg");
