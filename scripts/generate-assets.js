const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/Hp/.gemini/antigravity/brain/51ddc4d9-9457-4700-b7c6-8ea032304ec3/.user_uploaded/media_1795512063893_6e75d34c.png';

async function generateAll() {
  console.log('Generating image assets...');

  // 1. Copy full original logo
  fs.copyFileSync(srcPath, 'public/images/logo.png');

  // Also webp version of the logo
  await sharp(srcPath)
    .webp({ quality: 95 })
    .toFile('public/images/logo.webp');

  // 2. Trimmed version of the original logo
  const trimmedBuffer = await sharp(srcPath).trim().toBuffer();
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log('Trimmed size:', trimmedMeta.width, 'x', trimmedMeta.height);

  // 3. Clean squared badge logo (centered with safe padding)
  const pad = 64;
  const maxDim = 1024 - pad * 2;
  const scale = Math.min(maxDim / trimmedMeta.width, maxDim / trimmedMeta.height);
  const w = Math.round(trimmedMeta.width * scale);
  const h = Math.round(trimmedMeta.height * scale);

  const fittedLogo = await sharp(trimmedBuffer)
    .resize(w, h, { fit: 'inside' })
    .toBuffer();

  // Clean white-background 1024x1024 master icon
  const masterIconBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: fittedLogo, gravity: 'center' }])
  .png()
  .toBuffer();

  // Save badge version
  fs.writeFileSync('public/images/logo-badge.png', masterIconBuffer);

  // 4. Transparent version
  // Ensure we get 4 channels (RGBA)
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transData = Buffer.from(data);
  for (let i = 0; i < transData.length; i += 4) {
    if (transData[i] > 240 && transData[i+1] > 240 && transData[i+2] > 240) {
      transData[i+3] = 0;
    }
  }
  await sharp(transData, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile('public/images/logo-transparent.png');

  // 5. PWA Icon 512x512
  await sharp(masterIconBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');

  // 6. PWA Icon 192x192
  await sharp(masterIconBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');

  // 7. Apple Touch Icon 180x180
  await sharp(masterIconBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  // 8. Favicon 32x32 & 16x16 & 48x48
  const fav48 = await sharp(masterIconBuffer).resize(48, 48).png().toBuffer();
  const fav32 = await sharp(masterIconBuffer).resize(32, 32).png().toBuffer();
  const fav16 = await sharp(masterIconBuffer).resize(16, 16).png().toBuffer();

  fs.writeFileSync('public/favicon-32x32.png', fav32);
  fs.writeFileSync('public/favicon-16x16.png', fav16);

  // 9. Standard multi-size favicon.ico
  function createIco(pngEntries) {
    const count = pngEntries.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // icon
    header.writeUInt16LE(count, 4); // count
    let offset = 6 + count * 16;
    const dirEntries = [];
    for (const { width, height, buffer } of pngEntries) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(width >= 256 ? 0 : width, 0);
      entry.writeUInt8(height >= 256 ? 0 : height, 1);
      entry.writeUInt8(0, 2);
      entry.writeUInt8(0, 3);
      entry.writeUInt16LE(1, 4);
      entry.writeUInt16LE(32, 6);
      entry.writeUInt32LE(buffer.length, 8);
      entry.writeUInt32LE(offset, 12);
      dirEntries.push(entry);
      offset += buffer.length;
    }
    return Buffer.concat([header, ...dirEntries, ...pngEntries.map(p => p.buffer)]);
  }

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 }
  ]);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  fs.writeFileSync('app/favicon.ico', icoBuffer);

  // 10. OpenGraph / Twitter Card Image (1200 x 630)
  // Create an authoritative, high-impact civic banner with the logo, municipal identity, and platform features
  const logoForOg = await sharp(trimmedBuffer)
    .resize(460, 340, { fit: 'inside' })
    .toBuffer();

  // Create an SVG overlay for typography & styling on the 1200x630 canvas
  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#071D49" />
          <stop offset="60%" stop-color="#0A2A66" />
          <stop offset="100%" stop-color="#051535" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FFB81D" />
          <stop offset="100%" stop-color="#F59E0B" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />

      <!-- Top decorative stripe -->
      <rect x="0" y="0" width="1200" height="8" fill="url(#goldGrad)" />

      <!-- Subtle background grid/accents -->
      <circle cx="1050" cy="150" r="280" fill="#FFB81D" opacity="0.04" />
      <circle cx="150" cy="550" r="200" fill="#1d70b8" opacity="0.06" />

      <!-- Card container on right for logo -->
      <rect x="670" y="115" width="460" height="400" rx="24" fill="#FFFFFF" filter="drop-shadow(0 20px 30px rgba(0,0,0,0.35))" />

      <!-- Left Column: Typography & Badges -->
      <!-- Eyebrow Pill -->
      <rect x="70" y="90" width="370" height="34" rx="17" fill="rgba(255, 184, 29, 0.15)" stroke="#FFB81D" stroke-width="1.5" />
      <text x="90" y="112" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#FFB81D" letter-spacing="1.5">HYDERABAD MUNICIPAL WARDS · GHMC</text>

      <!-- Main Headline -->
      <text x="70" y="200" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="900" fill="#FFFFFF" letter-spacing="-1">NigamSetu</text>
      <text x="70" y="260" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="700" fill="#FFB81D">AI Civic Fix &amp; Verification</text>

      <!-- Subtitle -->
      <text x="70" y="325" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="rgba(255, 255, 255, 0.82)" width="520">
        Citizen grievance portal with photographic evidence verification.
      </text>
      <text x="70" y="355" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="rgba(255, 255, 255, 0.82)">
        Repairs undergo 4-point visual and spatial audit before closure.
      </text>

      <!-- Pill feature tags -->
      <g transform="translate(70, 420)">
        <!-- Tag 1 -->
        <rect x="0" y="0" width="160" height="38" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
        <text x="20" y="24" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">📷 Photo Evidence</text>

        <!-- Tag 2 -->
        <rect x="175" y="0" width="150" height="38" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
        <text x="195" y="24" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">📍 PostGIS GIS</text>

        <!-- Tag 3 -->
        <rect x="340" y="0" width="170" height="38" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
        <text x="360" y="24" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF">⚡ Zero Ghost Fixes</text>
      </g>

      <!-- Bottom domain bar -->
      <line x1="70" y1="520" x2="550" y2="520" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
      <text x="70" y="555" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#93C5FD">nigamsetu.org · Official Civic Redressal</text>
    </svg>
  `);

  await sharp(ogSvg)
    .composite([{
      input: logoForOg,
      left: 670 + Math.round((460 - (await sharp(logoForOg).metadata()).width) / 2),
      top: 115 + Math.round((400 - (await sharp(logoForOg).metadata()).height) / 2)
    }])
    .png({ quality: 95 })
    .toFile('public/images/og-image.png');

  console.log('OpenGraph image created at public/images/og-image.png');
  console.log('All image assets created successfully!');
}

generateAll().catch(err => {
  console.error(err);
  process.exit(1);
});
