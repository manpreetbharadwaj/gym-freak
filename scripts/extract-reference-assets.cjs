/* Rebuild only missing local reference crops. Existing replacement artwork is never overwritten.
 * Uses jimp-compact already installed through Expo; no network or extra dependencies.
 * Usage: node scripts/extract-reference-assets.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');
const manifest = require('../src/assets/image-manifest.json');

async function main() {
  const assetsRoot = path.resolve(__dirname, '../src/assets');
  const reference = await Jimp.read(path.join(assetsRoot, manifest.reference));
  let created = 0;
  for (const entry of Object.values(manifest.assets)) {
    const destination = path.join(assetsRoot, 'images', entry.file);
    if (fs.existsSync(destination)) continue;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    // Tiny neutral files declare exact replacement paths; AssetImage shows a vector until supplied.
    const image = entry.crop ? reference.clone().crop(...entry.crop) : new Jimp(16, 16, 0xf3f5ffff);
    if (destination.endsWith('.jpg')) image.quality(88);
    await image.writeAsync(destination);
    created += 1;
  }
  console.log(`Created ${created} assets; existing files retained. No images were upscaled.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
