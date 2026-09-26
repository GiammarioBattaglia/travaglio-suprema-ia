import fs from 'node:fs/promises';
import path from 'node:path';
import { generateCaricature } from './render-caricature.mjs';

const root=process.cwd();
const revisions={
  '2026-09-23-bollo-appuntamento-2027': 'È abolito dal 2027. Fino ad allora vuole godersi gli ultimi stipendi.',
  '2026-09-23-meloni-fine-legislatura': 'Caso chiuso. In politica è il modo elegante di lasciare la porta aperta.',
  '2026-09-24-senato-via-libera-nucleare': 'Hanno acceso il nucleare. Per ora consuma soltanto carta.',
  '2026-09-25-scuola-tetto-30': 'Finalmente la matematica serve: adesso decide anche chi si siede al banco.'
};
const staged=[];
for (const [slug,answer] of Object.entries(revisions)) {
  if (answer.length>90 || answer.trim().split(/\s+/).length>16) throw new Error('Punchline fuori limite: '+slug);
  const file=path.join(root,'data','episodes',slug+'.json');
  const ep=JSON.parse(await fs.readFile(file,'utf8'));
  if (ep.slug!==slug || ep.published!==true || ep.image_status!=='generated_jpeg') throw new Error('Stato inatteso: '+slug);
  const next={...ep,answer,satire_quality_pass:true};
  const generated=await generateCaricature(next);
  staged.push({slug,file,next,buffer:generated.buffer,prompt:generated.prompt});
  console.log('STAGED '+slug+' '+generated.buffer.length);
}
for (const item of staged) {
  item.next.image_prompt=item.prompt;
  item.next.image_generated_at=new Date().toISOString();
  item.next.image_status='generated_jpeg';
  item.next.image_fallback=false;
  await fs.writeFile(item.file,JSON.stringify(item.next,null,2)+'\n');
  await fs.writeFile(path.join(root,'assets','episodes',item.slug+'.jpg'),item.buffer);
}
const {spawn}=await import('node:child_process');
await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['scripts/build-site.mjs'],{cwd:root,stdio:'inherit'});
 child.on('exit',c=>c===0?resolve():reject(new Error('build-site '+c)));
});
console.log('HISTORICAL_SATIRE_REVISION_OK');
