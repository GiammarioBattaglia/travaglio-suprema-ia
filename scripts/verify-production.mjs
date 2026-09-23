import { setTimeout as sleep } from 'node:timers/promises';
const slug=process.env.PUBLISHED_SLUG;
if(!slug) throw new Error('Missing PUBLISHED_SLUG');
const base='https://travaglio-suprema-ia.vercel.app';
let ready=false;
for(let n=0;n<24;n++) {
  try {
    const res=await fetch(base+'/data/site.json?check='+Date.now(),{cache:'no-store'});
    if(!res.ok) throw new Error('site.json '+res.status);
    const site=await res.json();
    if(site.current?.slug!==slug) throw new Error('Deployment not yet updated');
    const page=await fetch(base+'/episodio/'+encodeURIComponent(slug)+'/');
    if(!page.ok) throw new Error('Episode page '+page.status);
    const html=await page.text();
    if(!html.includes(site.current.image)||!html.includes('download=')) throw new Error('Image or download link missing');
    const img=await fetch(base+site.current.image);
    if(!img.ok) throw new Error('Image HTTP '+img.status);
    const bytes=Buffer.from(await img.arrayBuffer());
    if(bytes.length<1000) throw new Error('Image empty');
    const all=site.all||[];
    if(new Set(all.map(e=>e.slug)).size!==all.length || (site.archive||[]).length!==all.length-1) throw new Error('Archive inconsistent');
    ready=true; console.log('LIVE_VERIFIED '+slug+' '+site.current.image_status+' '+bytes.length);break;
  }catch(err){console.warn('LIVE_CHECK '+(n+1)+' '+err.message);if(n<23)await sleep(10000);}
}
if(!ready)process.exitCode=1;
