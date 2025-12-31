import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const iconsDir = join(rootDir, "public", "icons");

// Oaikoロゴ: シンプルな円形アイコン（青色背景に白い「O」）
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#3b82f6"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.32}" fill="none" stroke="white" stroke-width="${size * 0.08}"/>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });

  for (const size of sizes) {
    const svg = createSvg(size);
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg)).png().toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  const appleSvg = createSvg(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(join(iconsDir, "apple-touch-icon.png"));
  console.log("Generated: apple-touch-icon.png");

  // Favicon (32x32)
  const faviconSvg = createSvg(32);
  await sharp(Buffer.from(faviconSvg))
    .png()
    .toFile(join(rootDir, "public", "favicon.ico"));
  console.log("Generated: favicon.ico");

  console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
