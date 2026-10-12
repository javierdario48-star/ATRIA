import fs from 'node:fs';
import path from 'node:path';
const input=path.resolve('vendor/atria-4.8.6/index.html');
const output=path.resolve('experiments/map-physics/hospital-original.webp');
const html=fs.readFileSync(input,'utf8');
const found=html.match(/const BG_SRC="data:image\\/webp;base64,([^"]+)"/);
if(!found)throw new Error('Original BG_SRC image not found');
fs.writeFileSync(output,Buffer.from(found[1],'base64'));
console.log('Original hospital background extracted:',output);
