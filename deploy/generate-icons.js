const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// SVG 아이콘 내용
const svgContent = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="512" r="512" fill="url(#gradient1)"/>
  <g transform="translate(512, 512)">
    <path d="M -220 -100 L 180 -20 L 220 180 L 60 40 L -220 -100 Z" fill="white" fill-opacity="0.9"/>
    <path d="M 60 40 L 180 -20 L 80 120 L 60 40 Z" fill="white" fill-opacity="0.7"/>
    <path d="M -220 -100 L 180 -20 L 60 40 L -100 -40 L -220 -100 Z" fill="white"/>
  </g>
  <circle cx="750" cy="750" r="80" fill="white" fill-opacity="0.8"/>
  <circle cx="850" cy="650" r="60" fill="white" fill-opacity="0.6"/>
  <circle cx="870" cy="780" r="50" fill="white" fill-opacity="0.5"/>
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0088cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0066aa;stop-opacity:1" />
    </linearGradient>
  </defs>
</svg>`;

async function generateIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  
  // assets 디렉토리 생성
  await fs.mkdir(assetsDir, { recursive: true });
  
  // SVG를 버퍼로 변환
  const svgBuffer = Buffer.from(svgContent);
  
  // Windows ICO 생성 (여러 크기 포함)
  console.log('Generating Windows ICO...');
  const sizes = [16, 32, 48, 64, 128, 256];
  const icoBuffers = await Promise.all(
    sizes.map(size => 
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  // PNG-to-ICO 패키지를 사용하는 대신 간단한 방법 사용
  // Windows는 256x256 PNG를 ICO로 사용 가능
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(assetsDir, 'icon.ico'));
  
  // macOS ICNS를 위한 PNG 생성
  console.log('Generating macOS icon...');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  
  // Linux용 PNG
  console.log('Generating Linux PNG...');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'icon-linux.png'));
  
  // 다양한 크기의 PNG 생성 (electron-builder용)
  const pngSizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  console.log('Generating various PNG sizes...');
  
  for (const size of pngSizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(assetsDir, `icon-${size}x${size}.png`));
  }
  
  console.log('Icon generation completed!');
  console.log('\nNote: For macOS .icns file, use:');
  console.log('  iconutil -c icns assets/icon.iconset');
  console.log('  after creating iconset folder with required sizes');
}

// npm 스크립트로 실행되지 않은 경우에만 실행
if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };