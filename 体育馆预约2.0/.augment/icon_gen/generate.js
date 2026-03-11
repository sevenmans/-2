const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const icons = [
  { name: 'home', iconName: 'home' },
  { name: 'venue', iconName: 'building-storefront' },
  { name: 'sharing', iconName: 'users' },
  { name: 'booking', iconName: 'document-text' },
  { name: 'user', iconName: 'user' }
];

const download = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

async function generate() {
  const outputDir = '/Users/lianghengpanchuanqihaodenanren/Desktop/体育馆预约 2/体育馆预约2.0/src/static/tabbar';
  
  for (const item of icons) {
    try {
      const outlineUrl = `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline/${item.iconName}.svg`;
      const solidUrl = `https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/solid/${item.iconName}.svg`;
      
      let outlineSvg = await download(outlineUrl);
      let solidSvg = await download(solidUrl);
      
      // Replace currentColor with actual hex colors
      outlineSvg = outlineSvg.replace(/currentColor/g, '#666666'); // Unselected color
      solidSvg = solidSvg.replace(/currentColor/g, '#ff6b35');     // Selected color
      
      // Add standard size
      
      // Convert and resize with dark grey color for outline and orange color for solid
      await sharp(Buffer.from(outlineSvg))
        .resize(81, 81)
        .png()
        .toFile(path.join(outputDir, `${item.name}.png`));
        
      await sharp(Buffer.from(solidSvg))
        .resize(81, 81)
        .png()
        .toFile(path.join(outputDir, `${item.name}-active.png`));
        
      console.log(`Successfully generated ${item.name} icons`);
    } catch (err) {
      console.error(`Error generating ${item.name}:`, err);
    }
  }
}

generate();
