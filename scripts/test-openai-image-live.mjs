import fs from 'node:fs/promises';
import sharp from 'sharp';
import { generateCaricature } from './render-caricature.mjs';

if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY assente nel runner');
const fixture = JSON.parse(await fs.readFile('data/episodes/2026-09-23-bollo-appuntamento-2027.json','utf8'));
const result = await generateCaricature(fixture);
const meta = await sharp(result.buffer,{failOn:'error'}).metadata();
if (meta.format !== 'jpeg' || meta.width !== 1600 || meta.height !== 900 || result.buffer.length < 80000) {
  throw new Error('Risposta API valida ma rendering finale non conforme');
}
console.log('OPENAI_LIVE_IMAGE_OK model='+result.model+' bytes='+result.buffer.length+' dimensions='+meta.width+'x'+meta.height);
