import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateCaricature } from './render-caricature.mjs';

const root=process.cwd();
const site=JSON.parse(await fs.readFile(path.join(root,'data','site.json'),'utf8'));
const current=site.current;
if(!current?.slug) throw new Error('Episodio corrente non trovato');
const episodePath=path.join(root,'data','episodes',current.slug+'.json');
const ep=JSON.parse(await fs.readFile(episodePath,'utf8'));
if(ep.image_status==='generated_jpeg' && String(ep.image||'').endsWith('.jpg')){
  console.log('CURRENT_IMAGE_ALREADY_API_JPEG '+ep.slug);
  process.exit(0);
}
const result=await generateCaricature(ep);
const target=path.join(root,'assets','episodes',ep.slug+'.jpg');
await fs.writeFile(target,result.buffer);
ep.image='/assets/episodes/'+ep.slug+'.jpg';
ep.imageAlt='Caricatura satirica generata tramite OpenAI Image API per l’episodio '+ep.title;
ep.image_prompt=result.prompt;
ep.image_status='generated_jpeg';
ep.image_fallback=false;
ep.image_model=result.model;
ep.image_generated_at=new Date().toISOString();
await fs.writeFile(episodePath,JSON.stringify(ep,null,2)+'\n');
await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['scripts/build-site.mjs'],{cwd:root,stdio:'inherit'});
 child.on('exit',code=>code===0?resolve():reject(new Error('build-site exited '+code)));
});
console.log('CURRENT_IMAGE_UPGRADED '+ep.slug+' '+ep.image+' model='+result.model+' bytes='+result.buffer.length);
