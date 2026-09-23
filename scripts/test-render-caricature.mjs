import fs from 'node:fs/promises';
import sharp from 'sharp';
import { generateCaricature } from './render-caricature.mjs';
const fixture=JSON.parse(await fs.readFile('data/episodes/2026-09-23-bollo-appuntamento-2027.json','utf8'));
const image=await fs.readFile('assets/episodes/2026-09-23-meloni-fine-legislatura-hq.jpg');
const rendererSource=await fs.readFile('scripts/render-caricature.mjs','utf8');
if(/DOMANDA INVENTATA|RISPOSTA SATIRICA/.test(rendererSource)) throw new Error('Etichette editoriali vietate nel renderer');
if(!rendererSource.includes('renderSpeechBubble')) throw new Error('Layout a fumetti non attivo');
const halfBaseMatch=rendererSource.match(/const halfBase = (\d+);/);
if(!halfBaseMatch || Number(halfBaseMatch[1])>12) throw new Error('Coda fumetto troppo larga: regressione visiva');
if(!rendererSource.includes('stroke-width="3.5"')) throw new Error('Bordo fumetto troppo pesante o non conforme');

process.env.OPENAI_API_KEY='test-only-not-a-secret';
const request=globalThis.fetch;
globalThis.fetch=async()=>new Response(JSON.stringify({data:[{b64_json:image.toString('base64')}]}),{status:200,headers:{'content-type':'application/json'}});
try {
 const result=await generateCaricature(fixture);
 const meta=await sharp(result.buffer,{failOn:'error'}).metadata();
 if(meta.format!=='jpeg'||meta.width!==1600||meta.height!==900||result.buffer.length<80000)throw new Error('Render JPEG test failed');
 console.log('MOCK_RENDER_VALIDATED 1600x900 JPEG; no live API call; no publication');
} finally { globalThis.fetch=request; }
