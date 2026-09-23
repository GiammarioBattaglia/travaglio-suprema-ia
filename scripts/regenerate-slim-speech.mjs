import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateCaricature } from './render-caricature.mjs';

const root=process.cwd();
const slugs=[
  '2026-09-23-bollo-appuntamento-2027',
  '2026-09-23-meloni-fine-legislatura'
];

for (const slug of slugs) {
  const episodePath=path.join(root,'data','episodes',slug+'.json');
  const ep=JSON.parse(await fs.readFile(episodePath,'utf8'));
  const result=await generateCaricature(ep);
  const targetRel='/assets/episodes/'+slug+'-slim.jpg';
  const target=path.join(root,targetRel.replace(/^\//,''));
  await fs.writeFile(target,result.buffer,{flag:'wx'});
  if(ep.image && ep.image!==targetRel) ep.previous_image=ep.image;
  ep.image=targetRel;
  ep.imageAlt='Caricatura satirica con fumetti tradizionali, code sottili e dialogo leggibile.';
  ep.image_prompt=result.prompt;
  ep.image_status='generated_jpeg';
  ep.image_fallback=false;
  ep.image_model=result.model;
  ep.image_generated_at=new Date().toISOString();
  ep.dialogue_layout='speech_bubbles_slim';
  await fs.writeFile(episodePath,JSON.stringify(ep,null,2)+'\n');
  console.log('SLIM_SPEECH_IMAGE_UPGRADED '+slug+' '+targetRel+' bytes='+result.buffer.length);
}

await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/build-site.mjs'],{cwd:root,stdio:'inherit'});
  child.on('exit',code=>code===0?resolve():reject(new Error('build-site exited '+code)));
});
