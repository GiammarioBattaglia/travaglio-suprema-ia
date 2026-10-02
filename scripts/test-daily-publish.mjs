import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const publisher = await fs.readFile(new URL('./publish-autonomous.mjs', import.meta.url), 'utf8');
const reviewModule = await fs.readFile(new URL('./editorial-review.mjs', import.meta.url), 'utf8');
const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for (const scenario of ['missing', 'today_exists', 'stale_pending', 'revision_applied']) {
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
    const output = path.join(root,'outputs');
    const result = spawnSync(process.execPath,['scripts/publish-autonomous.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:output}});
    if (['today_exists','revision_applied'].includes(scenario)) {
      assert.equal(result.status,0,result.stderr);
      assert.match(await fs.readFile(output,'utf8'), new RegExp('slug='+today+'-fixture'));
    } else {
      assert.notEqual(result.status,0);
      assert.match(result.stderr,/MISSING_DAILY_EPISODE/);
    }
    assert.deepEqual(await fs.readdir(path.join(root,'data/episodes')),scenario==='revision_applied'?[today+'-fixture.json']:[]);
    console.log(scenario+': PASS');
  } finally { await fs.rm(root,{recursive:true,force:true}); }
}
