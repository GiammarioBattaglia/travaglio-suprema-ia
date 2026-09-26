let deferredInstallPrompt=null;
let episodes=[];
let currentIndex=0;
let browserMode='vignettes';

async function loadSite(){
  const res=await fetch('/data/site.json?ts='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('site.json non disponibile');
  return res.json();
}

function setSourceLine(el,ep){
  el.replaceChildren();
  el.append(document.createTextNode(`Fonte: ${ep.source?.name||'—'} · ${ep.date}`));
  if(ep.source?.url){
    el.append(document.createTextNode(' · '));
    const a=document.createElement('a');
    a.href=ep.source.url;
    a.target='_blank';
    a.rel='noreferrer';
    a.textContent='fonte originale';
    el.append(a);
  }
}

function getSources(ep){
  const raw=[
    ...(Array.isArray(ep?.sources)?ep.sources:[]),
    ...(ep?.source?[ep.source]:[])
  ];
  const seen=new Set();
  return raw.filter(item=>{
    const url=String(item?.url||'').trim();
    const name=String(item?.name||'').trim();
    if(!url||!name||seen.has(url))return false;
    seen.add(url);
    return true;
  });
}

function renderSources(ep){
  const list=document.getElementById('episodeSourcesList');
  if(!list)return;
  list.replaceChildren();
  const sources=getSources(ep);
  if(!sources.length){
    const empty=document.createElement('div');
    empty.className='sources-empty';
    empty.textContent='Nessuna fonte disponibile per questo episodio.';
    list.append(empty);
    return;
  }
  for(const item of sources){
    const card=document.createElement('div');
    card.className='source-card';

    const main=document.createElement('div');
    main.className='source-card-main';

    const name=document.createElement('span');
    name.className='source-card-name';
    name.textContent=item.name;

    const date=document.createElement('span');
    date.className='source-card-date';
    date.textContent=ep.event_date?`Fatto del ${ep.event_date}`:`Episodio del ${ep.date}`;

    const link=document.createElement('a');
    link.className='source-card-link';
    link.href=item.url;
    link.target='_blank';
    link.rel='noreferrer';
    link.textContent='Apri fonte';

    main.append(name,date);
    card.append(main,link);
    list.append(card);
  }
}

function updateBrowserState(){
  const counter=document.getElementById('episodeCounter');
  const prev=document.getElementById('prevEpisodeBtn');
  const next=document.getElementById('nextEpisodeBtn');
  const tabV=document.getElementById('tabVignettes');
  const tabS=document.getElementById('tabSources');
  const panelV=document.getElementById('vignetteBrowserPanel');
  const panelS=document.getElementById('sourcesBrowserPanel');

  if(counter)counter.textContent=episodes.length?`${currentIndex+1} di ${episodes.length}`:'—';
  // data.all è ordinato dal più recente al più vecchio.
  if(prev)prev.disabled=currentIndex>=episodes.length-1;
  if(next)next.disabled=currentIndex<=0;

  const sourceMode=browserMode==='sources';
  if(tabV){
    tabV.classList.toggle('is-active',!sourceMode);
    tabV.setAttribute('aria-selected',String(!sourceMode));
  }
  if(tabS){
    tabS.classList.toggle('is-active',sourceMode);
    tabS.setAttribute('aria-selected',String(sourceMode));
  }
  if(panelV)panelV.hidden=sourceMode;
  if(panelS)panelS.hidden=!sourceMode;
}

function renderCurrent(ep){
  const title=document.getElementById('episodeTitle');
  const source=document.getElementById('sourceLine');
  const headline=document.getElementById('newsHeadline');
  const news=document.getElementById('newsText');
  const q=document.getElementById('questionText');
  const a=document.getElementById('answerText');
  const open=document.getElementById('openEpisodeBtn');
  const img=document.getElementById('heroImage');

  if(!ep){
    title.textContent='Nessun episodio pubblicato';
    return;
  }

  title.textContent=ep.title;
  setSourceLine(source,ep);
  headline.textContent=ep.headline;
  news.textContent=ep.news_text;
  q.textContent=ep.question;
  a.textContent=ep.answer;
  open.href=ep.url;

  const version=encodeURIComponent(ep.image_generated_at||ep.published_at||ep.date||Date.now());
  const imagePath=ep.image||'/assets/social.jpg';
  img.src=imagePath+'?v='+version;
  img.alt=ep.imageAlt||ep.title;

  for(const id of ['imageOpenLink','originalImageBtn','downloadImageBtn']){
    const el=document.getElementById(id);
    if(el)el.href=imagePath+'?v='+version;
  }
  const download=document.getElementById('downloadImageBtn');
  if(download)download.download=`${ep.slug||'travaglio-suprema-ia'}-vignetta${imagePath.endsWith('.svg')?'.svg':'.jpg'}`;

  renderSources(ep);
  updateBrowserState();

  document.getElementById('shareBtn').onclick=async()=>{
    const shareData={
      title:ep.title,
      text:`${ep.question} — ${ep.answer}`,
      url:new URL(ep.url,location.origin).toString()
    };
    if(navigator.share){await navigator.share(shareData);return;}
    await navigator.clipboard.writeText(shareData.text+' '+shareData.url);
    alert('Link copiato negli appunti.');
  };
}

function selectEpisode(index){
  if(!episodes.length)return;
  const bounded=Math.max(0,Math.min(index,episodes.length-1));
  if(bounded===currentIndex)return;
  currentIndex=bounded;
  renderCurrent(episodes[currentIndex]);
  document.querySelector('.episode')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function setBrowserMode(mode){
  browserMode=mode==='sources'?'sources':'vignettes';
  updateBrowserState();
}

function wireEpisodeBrowser(){
  document.getElementById('tabVignettes')?.addEventListener('click',()=>setBrowserMode('vignettes'));
  document.getElementById('tabSources')?.addEventListener('click',()=>setBrowserMode('sources'));
  document.getElementById('prevEpisodeBtn')?.addEventListener('click',()=>selectEpisode(currentIndex+1));
  document.getElementById('nextEpisodeBtn')?.addEventListener('click',()=>selectEpisode(currentIndex-1));

  const figure=document.querySelector('.vignette');
  if(!figure)return;
  let startX=null;
  let startY=null;
  figure.addEventListener('touchstart',event=>{
    const touch=event.changedTouches?.[0];
    if(!touch)return;
    startX=touch.clientX;
    startY=touch.clientY;
  },{passive:true});
  figure.addEventListener('touchend',event=>{
    if(startX===null||startY===null)return;
    const touch=event.changedTouches?.[0];
    if(!touch)return;
    const dx=touch.clientX-startX;
    const dy=touch.clientY-startY;
    startX=null;
    startY=null;
    if(Math.abs(dx)<60||Math.abs(dx)<=Math.abs(dy))return;
    if(dx<0)selectEpisode(currentIndex+1);
    else selectEpisode(currentIndex-1);
  },{passive:true});
}

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
});

async function init(){
  if('serviceWorker' in navigator){
    const reg=await navigator.serviceWorker.register('/sw.js?v=5').catch(()=>null);
    if(reg)reg.update().catch(()=>{});
  }

  const data=await loadSite();
  episodes=Array.isArray(data.all)&&data.all.length?data.all:(data.current?[data.current]:[]);
  currentIndex=Math.max(0,episodes.findIndex(ep=>ep.slug===data.current?.slug));
  if(currentIndex<0)currentIndex=0;
  wireEpisodeBrowser();
  renderCurrent(episodes[currentIndex]||data.current);

  document.getElementById('installBtn').addEventListener('click',async()=>{
    if(!deferredInstallPrompt){
      alert('Su Android usa il menu del browser e scegli “Installa app”. Su iPhone usa Safari e “Aggiungi alla schermata Home”.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null;
  });
}

init().catch(err=>{
  console.error(err);
  document.getElementById('episodeTitle').textContent='Impossibile caricare l’episodio';
});
