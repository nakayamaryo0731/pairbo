/**
 * staging用アプリアイコンの生成
 *
 * public/icons/ の各アイコンをグレースケール化 + 下部の「STG」帯を適用し、
 * public/icons/staging/ に同名で出力する。
 * （ブランドがピンク×青のデュオトーンになったため、色相回転ではなく
 * グレースケールで「本番ではない」ことを表す）
 *
 * 実行: node scripts/generate-staging-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "public/icons";
const OUT_DIR = "public/icons/staging";

const TARGETS = [
  "apple-touch-icon.png",
  "icon-72x72.png",
  "icon-96x96.png",
  "icon-128x128.png",
  "icon-144x144.png",
  "icon-152x152.png",
  "icon-192x192.png",
  "icon-384x384.png",
  "icon-512x512.png",
  "icon-maskable-512x512.png",
];

function stgBandSvg(width, height) {
  const bandHeight = Math.round(height * 0.26);
  const fontSize = Math.round(bandHeight * 0.62);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="#1e293b" fill-opacity="0.9"/>
  <text x="50%" y="${height - bandHeight / 2}" dominant-baseline="central" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="#fbbf24">STG</text>
</svg>`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const file of TARGETS) {
  const src = path.join(SRC_DIR, file);
  const { width, height } = await sharp(src).metadata();

  await sharp(src)
    .grayscale()
    .composite([{ input: stgBandSvg(width, height), top: 0, left: 0 }])
    .png()
    .toFile(path.join(OUT_DIR, file));

  console.log(`generated: ${OUT_DIR}/${file}`);
}

// ブラウザタブ用のstagingファビコン（32px PNG）
await sharp(path.join(SRC_DIR, "icon-72x72.png"))
  .grayscale()
  .resize(32, 32)
  .png()
  .toFile(path.join(OUT_DIR, "favicon-32x32.png"));
console.log(`generated: ${OUT_DIR}/favicon-32x32.png`);
