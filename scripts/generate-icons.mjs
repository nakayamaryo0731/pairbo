import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const iconsDir = join(rootDir, "public", "icons");
const sourceIcon = join(iconsDir, "logo.png");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  await mkdir(iconsDir, { recursive: true });

  const trimmedBuffer = await sharp(sourceIcon).trim().toBuffer();

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(trimmedBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  await sharp(trimmedBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(iconsDir, "apple-touch-icon.png"));
  console.log("Generated: apple-touch-icon.png");

  // Favicon (32x32)
  await sharp(trimmedBuffer)
    .resize(32, 32)
    .png()
    .toFile(join(rootDir, "public", "favicon.ico"));
  console.log("Generated: favicon.ico");

  console.log("\nAll icons generated successfully!");
}

generateIcons().catch(console.error);
