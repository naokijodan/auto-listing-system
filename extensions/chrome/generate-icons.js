/**
 * アイコン生成スクリプト
 *
 * 実行: node generate-icons.js
 * 必要: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// sharpがインストールされていない場合のフォールバック
async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, 'icons', 'icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);

    const sizes = [16, 32, 48, 128];

    for (const size of sizes) {
      const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: icon${size}.png`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('sharp not found. Creating placeholder icons...');
      createPlaceholderIcons();
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

// プレースホルダーアイコンを作成（1x1 透明PNG）
function createPlaceholderIcons() {
  const sizes = [16, 32, 48, 128];

  // 最小のPNGファイル（1x1 透明）
  // 実際の運用では、icon.svgを画像編集ソフトで変換してください
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
    fs.writeFileSync(outputPath, minimalPng);
    console.log(`Created placeholder: icon${size}.png (replace with actual ${size}x${size} icon)`);
  }

  console.log('\n⚠️  プレースホルダーアイコンを作成しました。');
  console.log('   実際の運用には icons/icon.svg を画像編集ソフトで');
  console.log('   16x16, 32x32, 48x48, 128x128 のPNGに変換してください。');
  console.log('\n   または以下を実行:');
  console.log('   npm install sharp && node generate-icons.js');
}

generateIcons();
