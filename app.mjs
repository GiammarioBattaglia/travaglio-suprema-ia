let deferredInstallPrompt=null;

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

  const version=encodeURIComponent(ep.published_at||ep.date||Date.now());
  img.src=(ep.image||'/assets/social.jpg')+'?v='+version;
  img.alt=ep.imageAlt||ep.title;

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
  renderCurrent(data.current);

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
