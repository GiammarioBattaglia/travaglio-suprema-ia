import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateCaricature } from './render-caricature.mjs';

const root=process.cwd();
const slug='2026-09-23-meloni-fine-legislatura';
const episodePath=path.join(root,'data','episodes',slug+'.json');
const ep=JSON.parse(await fs.readFile(episodePath,'utf8'));
if(!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY assente');
const result=await generateCaricature(ep);
const targetRel='/assets/episodes/'+slug+'-api.jpg';
const target=path.join(root,targetRel.replace(/^\//,''));
await fs.writeFile(target,result.buffer,{flag:'wx'});
ep.previous_image=ep.image;
ep.image=targetRel;
ep.imageAlt='Caricatura satirica rigenerata tramite OpenAI Image API con Marco Travaglio, Suprema IA e Giorgia Meloni.';
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
console.log('ARCHIVE_IMAGE_UPGRADED '+slug+' '+targetRel+' model='+result.model+' bytes='+result.buffer.length);
