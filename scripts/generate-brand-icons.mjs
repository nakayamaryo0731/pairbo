/**
 * ペアドット（ブランドマーク）からアプリアイコン一式を生成する
 *
 * LPのロゴ（ローズ #EE6B8D × ブルー #4D9DE8 の2円、重なりはmultiply相当の #484280）を
 * アイコン化する。maskable対応のためドットはセーフゾーン（中央80%）に収める。
 *
 * 実行: node scripts/generate-brand-icons.mjs [outDir]
 *   outDir省略時は public/icons に出力（favicon.ico 用の32/16pxはPNGで出力）
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = process.argv[2] ?? "public/icons";

const ROSE = "#EE6B8D";
const BLUE = "#4D9DE8";
const OVERLAP = "#484280"; // multiply(ROSE, BLUE)
const MILK = "#FFF8F4";

/**
 * @param size 出力キャンバスの一辺
 * @param opts.background 背景色（nullで透過）
 * @param opts.scale ドット全体の幅がキャンバスに占める割合
 */
function pairDotsSvg(size, { background = MILK, scale = 0.76 } = {}) {
  // ロゴの比率: 円の直径2r、中心間距離d = 0.625 * 2r（重なり37.5%）
  const totalW = size * scale;
  const r = totalW / (2 + 0.625);
  const d = r * 1.25;
  const cy = size / 2;
  const cx1 = size / 2 - d / 2;
  const cx2 = size / 2 + d / 2;
  const bgRect =
    background === null
      ? ""
      : `<rect width="${size}" height="${size}" fill="${background}"/>`;
  return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="c1"><circle cx="${cx1}" cy="${cy}" r="${r}"/></clipPath></defs>
  ${bgRect}
  <circle cx="${cx1}" cy="${cy}" r="${r}" fill="${ROSE}"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="${BLUE}"/>
  <circle cx="${cx2}" cy="${cy}" r="${r}" fill="${OVERLAP}" clip-path="url(#c1)"/>
</svg>`);
}

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

await mkdir(OUT_DIR, { recursive: true });

async function render(svg, file) {
  await sharp(svg).png().toFile(path.join(OUT_DIR, file));
  console.log(`generated: ${path.join(OUT_DIR, file)}`);
}

for (const size of PWA_SIZES) {
  await render(pairDotsSvg(size), `icon-${size}x${size}.png`);
}

// maskable: OSのマスクで四隅が切られるため、余白広め
await render(pairDotsSvg(512, { scale: 0.62 }), "icon-maskable-512x512.png");

// apple-touch-icon（180px、iOSが角丸を付けるので背景つき）
await render(pairDotsSvg(180), "apple-touch-icon.png");

// ブラウザタブ用（透過背景・ドットを大きく）
await render(
  pairDotsSvg(32, { background: null, scale: 0.96 }),
  "favicon-32x32.png",
);
await render(
  pairDotsSvg(16, { background: null, scale: 1.0 }),
  "favicon-16x16.png",
);

// LP・OG等で使う正方形ロゴ
await render(pairDotsSvg(512), "logo.png");
