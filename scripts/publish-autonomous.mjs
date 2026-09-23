import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateCaricature } from './render-caricature.mjs';

const root = process.cwd();
const incomingDir = path.join(root, 'incoming');
const episodesDir = path.join(root, 'data', 'episodes');
const assetsDir = path.join(root, 'assets', 'episodes');
const siteFile = path.join(root, 'data', 'site.json');
const compatFile = path.join(root, 'data', 'episodes.json');

const REQUIRED = ['date','slug','title','headline','summary','news_text','question','answer'];

function todayRome() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function independentHost(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('Le fonti devono usare HTTPS');
  return u.hostname.toLowerCase().replace(/^www\./, '');
}

async function guardDailyUniqueness(ep) {
  if (ep.date !== todayRome()) throw new Error('Episodio di data diversa da oggi a Roma: fail-closed');
  if (!ep.slug.startsWith(ep.date + '-')) throw new Error('Slug e data incoerenti');
  const existing = (await fs.readdir(episodesDir)).filter(name => name.endsWith('.json'));
  for (const name of existing) {
    const record = JSON.parse(await fs.readFile(path.join(episodesDir, name), 'utf8'));
    if (record.published === true && record.date === ep.date && record.slug !== ep.slug) {
      if (ep.edition !== 'extra' || ep.extra_approved !== true || !String(ep.extra_reason || '').trim()) {
        throw new Error('Esiste già un episodio oggi: nessuna pubblicazione duplicata automatica');
      }
    }
  }
  if (ep.edition === 'extra' && (ep.extra_approved !== true || !String(ep.extra_reason || '').trim())) {
    throw new Error('Extra non esplicitamente approvato');
  }
  const day = ep.event_date || ep.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('event_date non valida');
  const age = (Date.parse(ep.date + 'T12:00:00Z') - Date.parse(day + 'T12:00:00Z')) / 86400000;
  if (age < 0 || age > 1) throw new Error('Notizia non abbastanza recente: serve un fatto delle ultime 24 ore');
}


function escapeXml(value='') {
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&apos;");
}

function clamp(value, max) {
  const s=String(value||'').trim();
  return s.length<=max?s:s.slice(0,max-1)+'…';
}

function wrap(text, maxChars=34, maxLines=4) {
  const words=String(text||'').trim().split(/\s+/).filter(Boolean);
  const lines=[];
  let line='';
  for(const w of words){
    const next=line?line+' '+w:w;
    if(next.length<=maxChars){ line=next; continue; }
    if(line) lines.push(line);
    line=w;
    if(lines.length>=maxLines-1) break;
  }
  if(line && lines.length<maxLines) lines.push(line);
  return lines.slice(0,maxLines);
}

function textBlock(lines, x, y, size, lineHeight, weight='700', anchor='start') {
  return lines.map((line,i)=>`<text x="${x}" y="${y+i*lineHeight}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="#151515">${escapeXml(line)}</text>`).join('\n');
}

function buildSvg(ep) {
  const q=wrap(ep.question,32,4);
  const a=wrap(ep.answer,34,4);
  const subject=clamp((ep.characters||[]).filter(x=>x!=='Marco Travaglio'&&x!=='Suprema IA')[0]||'ATTUALITÀ',24);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#f6f2ea"/>
  <rect x="0" y="0" width="1600" height="72" fill="#122a42"/>
  <text x="54" y="47" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="800" fill="#ffffff">TRAVAGLIO &amp; LA SUPREMA IA · SATIRA INDIPENDENTE</text>

  <rect x="48" y="110" width="470" height="680" rx="28" fill="#ffffff" stroke="#d7cfc2" stroke-width="3"/>
  <circle cx="283" cy="300" r="100" fill="#e8e3dc" stroke="#151515" stroke-width="5"/>
  <path d="M205 282 Q282 205 360 282 Q345 225 282 215 Q220 225 205 282Z" fill="#292929"/>
  <rect x="217" y="285" width="58" height="35" rx="12" fill="none" stroke="#151515" stroke-width="6"/>
  <rect x="291" y="285" width="58" height="35" rx="12" fill="none" stroke="#151515" stroke-width="6"/>
  <line x1="275" y1="302" x2="291" y2="302" stroke="#151515" stroke-width="6"/>
  <path d="M230 355 Q282 390 334 355" fill="none" stroke="#151515" stroke-width="5"/>
  <path d="M160 650 Q282 505 405 650 L405 760 L160 760Z" fill="#283444"/>
  <text x="283" y="535" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="900" text-anchor="middle" fill="#a32226">TRAVAGLIO</text>
  <rect x="95" y="575" width="376" height="155" rx="24" fill="#ffffff" stroke="#a32226" stroke-width="4"/>
  ${textBlock(q,283,620,27,34,'700','middle')}

  <rect x="565" y="155" width="470" height="590" rx="42" fill="#122a42"/>
  <circle cx="800" cy="335" r="120" fill="#d7efff" opacity=".95"/>
  <circle cx="800" cy="335" r="82" fill="none" stroke="#72c7ff" stroke-width="14"/>
  <circle cx="800" cy="335" r="40" fill="#72c7ff"/>
  <path d="M690 335 H625 M975 335 H910 M800 225 V165 M800 505 V445" stroke="#72c7ff" stroke-width="12" stroke-linecap="round"/>
  <text x="800" y="520" font-family="Georgia,'Times New Roman',serif" font-size="48" font-weight="700" text-anchor="middle" fill="#ffffff">SUPREMA IA</text>
  <rect x="615" y="565" width="370" height="145" rx="24" fill="#ffffff"/>
  ${textBlock(a,800,610,27,34,'700','middle')}

  <rect x="1082" y="110" width="470" height="680" rx="28" fill="#ffffff" stroke="#d7cfc2" stroke-width="3"/>
  <rect x="1162" y="520" width="310" height="180" rx="18" fill="#ece7df" stroke="#151515" stroke-width="4"/>
  <circle cx="1317" cy="330" r="95" fill="#e8e3dc" stroke="#151515" stroke-width="5"/>
  <path d="M1225 650 H1410" stroke="#151515" stroke-width="7"/>
  <rect x="1192" y="560" width="250" height="58" rx="10" fill="#a32226"/>
  <text x="1317" y="599" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="900" text-anchor="middle" fill="#ffffff">${escapeXml(subject)}</text>
  <text x="1317" y="752" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" text-anchor="middle" fill="#6b655d">IL CASO DEL GIORNO</text>

  <text x="800" y="842" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700" text-anchor="middle" fill="#6b655d">Notizia reale · fonte indicata · domanda inventata · risposta satirica</text>
</svg>`;
}

function validate(ep){
  for(const k of REQUIRED){
    if(!String(ep[k]||'').trim()) throw new Error(`Campo obbligatorio mancante: ${k}`);
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ep.date)) throw new Error('Data non valida');
  if(!/^[a-z0-9-]+$/.test(ep.slug)) throw new Error('Slug non valido');
  if(ep.question.length>180) throw new Error('Domanda troppo lunga');
  if(ep.answer.length>180) throw new Error('Risposta troppo lunga');
  if(!ep.source?.name || !ep.source?.url?.startsWith('http')) throw new Error('Fonte primaria non valida');
  if(!Array.isArray(ep.sources) || ep.sources.length<2) throw new Error('Servono almeno due fonti');
  if(ep.sources.some(s=>!s?.name||!String(s.url||'').startsWith('https://'))) throw new Error('Fonti non valide');
  if (new Set(ep.sources.map(s => independentHost(s.url))).size < 2) throw new Error('Fonti non indipendenti');
  if (new Set(ep.sources.map(s => String(s.name).trim().toLowerCase())).size < 2) throw new Error('Nomi fonti non indipendenti');
  if (!ep.characters?.includes('Marco Travaglio') || !ep.characters?.includes('Suprema IA')) throw new Error('Personaggi obbligatori mancanti');
  if (!String(ep.satire_notice || '').includes('Satira indipendente')) throw new Error('Avvertenza satira mancante');
  if(ep.autonomous !== true) throw new Error('Manca autonomous=true');
  if(ep.editorial_pass !== true) throw new Error('Manca editorial_pass=true');
  if(ep.political_neutrality_pass !== true) throw new Error('Manca political_neutrality_pass=true');
}

async function runBuild(){
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/build-site.mjs'],{cwd:root,stdio:'inherit'});
    child.on('exit',code=>code===0?resolve():reject(new Error(`build-site exited with ${code}`)));
  });
}

async function promote(slug){
  const site=JSON.parse(await fs.readFile(siteFile,'utf-8'));
  const all=Array.isArray(site.all)?site.all:[];
  const target=all.find(ep=>ep.slug===slug);
  if(!target) throw new Error('Episodio non trovato dopo build');
  const archive=all.filter(ep=>ep.slug!==slug);
  await fs.writeFile(siteFile,JSON.stringify({current:target,archive,all},null,2)+'\n');
  await fs.writeFile(compatFile,JSON.stringify({current:target,archive},null,2)+'\n');
}

async function publishFile(file){
  const raw=await fs.readFile(path.join(incomingDir,file),'utf-8');
  const ep=JSON.parse(raw);
  const publishedPath=path.join(episodesDir,`${ep.slug}.json`);
  try {
    await fs.access(publishedPath);
    console.log(`Episodio già presente, non sovrascrivo: ${ep.slug}`);
    return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  validate(ep);
  await guardDailyUniqueness(ep);

  // Nessun file pubblico viene scritto prima di aver validato l'episodio.
  await fs.mkdir(episodesDir,{recursive:true});
  await fs.mkdir(assetsDir,{recursive:true});
  let image, imageAlt, imageStatus, imageFallback = false, imagePrompt = null;
  try {
    const result = await generateCaricature(ep);
    image = `/assets/episodes/${ep.slug}.jpg`;
    imageAlt = ep.imageAlt || `Caricatura satirica di Marco Travaglio, Suprema IA e protagonista della notizia: ${ep.title}`;
    imageStatus = 'generated_jpeg';
    imagePrompt = result.prompt;
    await fs.writeFile(path.join(assetsDir, `${ep.slug}.jpg`), result.buffer, {flag:'wx'});
    console.log(`Caricatura reale generata e verificata: ${image}`);
  } catch (error) {
    console.warn('Generazione JPEG fallita; fallback SVG: ' + error.message);
    image = `/assets/episodes/${ep.slug}.svg`;
    imageAlt = ep.imageAlt || `Vignetta satirica vettoriale di riserva: ${ep.title}`;
    imageStatus = 'fallback_svg';
    imageFallback = true;
    await fs.writeFile(path.join(assetsDir,`${ep.slug}.svg`),buildSvg(ep),{flag:'wx'});
  }

  const published={
    ...ep,
    published:true,
    status:'published',
    image,
    imageAlt,
    image_prompt: imagePrompt,
    image_status: imageStatus,
    image_fallback: imageFallback,
    satire_notice:ep.satire_notice||"Satira indipendente. Dialoghi e scene sono invenzioni umoristiche ispirate all'attualità.",
    published_at:new Date().toISOString()
  };
  await fs.writeFile(publishedPath,JSON.stringify(published,null,2)+'\n');
  await runBuild();
  await promote(ep.slug);
  console.log(`Pubblicato automaticamente: ${ep.slug}`);
  return true;
}

async function main(){
  await fs.mkdir(incomingDir,{recursive:true});
  const files=(await fs.readdir(incomingDir)).filter(f=>f.endsWith('.json')).sort();
  let changed=false;
  for(const file of files){
    if (await publishFile(file)) { changed = true; break; }
  }
  console.log(changed?'AUTONOMOUS_PUBLISH_CHANGED=1':'AUTONOMOUS_PUBLISH_CHANGED=0');
}
main().catch(err=>{console.error(err);process.exit(1);});
