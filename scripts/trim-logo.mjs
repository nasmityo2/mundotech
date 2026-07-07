import sharp from 'sharp';

const input = 'public/logo-light.png';
const output = 'public/logo-light.trimmed.png';

await sharp(input)
  .trim({ threshold: 0, lineArt: false })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`Trimmed logo: ${meta.width} x ${meta.height}`);
