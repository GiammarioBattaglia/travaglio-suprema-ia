import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const publisher = await fs.readFile(new URL('./publish-autonomous.mjs', import.meta.url), 'utf8');
const reviewModule = await fs.readFile(new URL('./editorial-review.mjs', import.meta.url), 'utf8');
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for (const scenario of ['missing', 'today_exists', 'stale_pending', 'revision_applied', 'long_question_fallback']) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'daily-publish-test-'));
  try {
    for (const dir of ['scripts','incoming','data/episodes']) await fs.mkdir(path.join(root,dir), {recursive:true});
    await fs.writeFile(path.join(root,'scripts/publish-autonomous.mjs'), publisher);
    await fs.writeFile(path.join(root,'scripts/editorial-review.mjs'), reviewModule);
    await fs.writeFile(path.join(root,'scripts/render-caricature.mjs'), 'export async function generateCaricature(){throw new Error("unexpected renderer call")}');
    const current = ['today_exists','revision_applied'].includes(scenario) ? {date:today,slug:today+'-fixture',published:true} : {date:'2000-01-01',published:true};
    await fs.writeFile(path.join(root,'data/site.json'), JSON.stringify({current}));
    if (scenario === 'stale_pending') await fs.writeFile(path.join(root,'incoming/old.json'), JSON.stringify({date:'2000-01-01',slug:'2000-01-01-old'}));
    if (scenario === 'revision_applied') {
      const record = {...current,title:'Test',question:'Domanda?',answer:'Risposta.',editorial_revision:'fixture-v2',image_status:'generated_jpeg'};
      await fs.writeFile(path.join(root,'data/episodes',record.slug+'.json'),JSON.stringify(record));
      await fs.writeFile(path.join(root,'incoming',record.slug+'.json'),JSON.stringify({...record,revision_requested:true,revision_of:record.slug}));
    }
    const longQuestion = 'Quando si promette una semplificazione delle procedure, chi verifica che la soluzione non richieda un nuovo modulo da compilare?';
    if (scenario === 'long_question_fallback') {
      assert.ok(longQuestion.length <= 130);
      const ep = {
        date:today,event_date:today,slug:today+'-long-question-fallback',
        autonomous:true,editorial_pass:true,political_neutrality_pass:true,satire_quality_pass:true,
        title:'Una semplificazione in più',headline:'Semplificazione delle procedure',summary:'Test',news_text:'Test',
        question:longQuestion,answer:'Un modulo per abolire i moduli.',
        source:{name:'Fonte uno',url:'https://example.com/fatto'},
        sources:[{name:'Fonte uno',url:'https://example.com/fatto'},{name:'Fonte due',url:'https://example.org/fatto'}],
        characters:['Marco Travaglio','Suprema IA','Le procedure'],
        satire_notice:'Satira indipendente. Contenuto inventato.',
        editorial_review:{version:2,method:'candidate_review',self_contained_question:true,inference_steps:1,
          needs_explanation:false,twist_count:1,alternatives:['Un modulo per abolire i moduli.','Un timbro digitale.','La fila delle file.'],
          selected_answer:'Un modulo per abolire i moduli.',selection_reason:'Gioco di parole immediato',fact_anchor:'Test'}
      };
      await fs.writeFile(path.join(root,'incoming',ep.slug+'.json'),JSON.stringify(ep));
      await fs.writeFile(path.join(root,'scripts/build-site.mjs'),
        "import fs from 'node:fs/promises'; const files=await fs.readdir('data/episodes'); const all=[]; for(const name of files) all.push(JSON.parse(await fs.readFile('data/episodes/'+name,'utf8'))); await fs.writeFile('data/site.json',JSON.stringify({all}));");
    }
    const output = path.join(root,'outputs');
    const result = spawnSync(process.execPath,['scripts/publish-autonomous.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:output}});
    if (['today_exists','revision_applied','long_question_fallback'].includes(scenario)) {
      assert.equal(result.status,0,result.stderr);
      assert.match(await fs.readFile(output,'utf8'), new RegExp('slug='+today+(scenario==='long_question_fallback'?'-long-question-fallback':'-fixture')));
    } else {
      assert.notEqual(result.status,0);
      assert.match(result.stderr,/MISSING_DAILY_EPISODE/);
    }
    if (scenario === 'long_question_fallback') {
      const imagePath=path.join(root,'assets/episodes',today+'-long-question-fallback.svg');
      const svg=await fs.readFile(imagePath,'utf8');
      const qlines=[...svg.matchAll(/<text x="283"[^>]*>([^<]*)<\/text>/g)].map(match=>match[1]);
      assert.equal(qlines.join(' '),longQuestion,'La domanda deve comparire integralmente nel fallback');
      const published=JSON.parse(await fs.readFile(path.join(root,'data/episodes',today+'-long-question-fallback.json'),'utf8'));
      assert.equal(published.image_status,'fallback_svg');
    } else {
      assert.deepEqual(await fs.readdir(path.join(root,'data/episodes')),scenario==='revision_applied'?[today+'-fixture.json']:[]);
    }
    console.log(scenario+': PASS');
  } finally { await fs.rm(root,{recursive:true,force:true}); }
}
