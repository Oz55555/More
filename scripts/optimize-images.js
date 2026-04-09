/**
 * Image optimization script - converts PNG images to WebP
 * Run: node scripts/optimize-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'images');

const imagesToConvert = [
    { input: 'cw.png', quality: 85 },
    { input: 'wave.png', quality: 82 },
    { input: 'Strategy.png', quality: 82 },
    { input: 'Diverses.png', quality: 82 },
    { input: 'Global.png', quality: 82 },
];

async function convertToWebP() {
    console.log('🖼️  Starting image optimization...\n');

    for (const img of imagesToConvert) {
        const inputPath = path.join(imagesDir, img.input);
        const outputName = img.input.replace('.png', '.webp');
        const outputPath = path.join(imagesDir, outputName);

        if (!fs.existsSync(inputPath)) {
            console.log(`⚠️  Skipping ${img.input} (not found)`);
            continue;
        }

        try {
            const inputStats = fs.statSync(inputPath);
            await sharp(inputPath)
                .webp({ quality: img.quality })
                .toFile(outputPath);

            const outputStats = fs.statSync(outputPath);
            const savedKB = ((inputStats.size - outputStats.size) / 1024).toFixed(0);
            const savedPct = ((1 - outputStats.size / inputStats.size) * 100).toFixed(0);

            console.log(`✅ ${img.input} → ${outputName}`);
            console.log(`   ${(inputStats.size / 1024).toFixed(0)} KB → ${(outputStats.size / 1024).toFixed(0)} KB  (saved ${savedKB} KB / ${savedPct}%)\n`);
        } catch (err) {
            console.error(`❌ Failed to convert ${img.input}:`, err.message);
        }
    }

    console.log('✅ Image optimization complete!');
}

convertToWebP();
