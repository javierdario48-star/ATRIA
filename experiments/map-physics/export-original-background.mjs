import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('vendor/atria-4.8.6/index.html');
const target = path.resolve('experiments/map-physics/hospital-original.webp');
const html = fs.readFileSync(source, 'utf8');
const match = html.match(/const BG_SRC="data:image\/webp;base64,([^"]+)"/);
if (!match) throw new Error('BG_SRC original WebP source not found');
fs.writeFileSync(target, Buffer.from(match[1], 'base64'));
console.log('Original 1024×1536 hospital background extracted to', target);

