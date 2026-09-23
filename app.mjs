let deferredInstallPrompt = null;

async function loadSite() {
  const res = await fetch(`/data/site.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('site.json non disponibile');
  return res.json();
}

function setSourceLine(el, ep) {
  el.textContent = '';
  const label = document.createTextNode(`Fonte: ${ep.source?.name || '—'} · ${ep.date}`);
  el.appendChild(label);
  if (ep.source?.url) {
    el.appendChild(document.createTextNode(' · '));
    const link = document.createElement('a');
    link.href = ep.source.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'fonte originale';
    el.appendChild(link);
  }
}

function renderCurrent(ep) {
  const title = document.getElementById('episodeTitle');
  const sourceLine = document.getElementById('sourceLine');
  const newsHeadline = document.getElementById('newsHeadline');
  const newsText = document.getElementById('newsText');
  const questionText = document.getElementById('questionText');
  const answerText = document.getElementById('answerText');
  const openEpisodeBtn = document.getElementById('openEpisodeBtn');
  const heroImage = document.getElementById('heroImage');

  if (!ep) {
    title.textContent = 'Nessun episodio pubblicato';
    sourceLine.textContent = '';
    newsHeadline.textContent = '—';
    newsText.textContent = '—';
    questionText.textContent = '—';
    answerText.textContent = '—';
    heroImage.src = '/assets/social.jpg';
    openEpisodeBtn.href = '/archive/';
    openEpisodeBtn.textContent = 'Apri archivio';
    return;
  }

  title.textContent = ep.title;
  setSourceLine(sourceLine, ep);
  newsHeadline.textContent = ep.headline;
  newsText.textContent = ep.news_text;
  questionText.textContent = ep.question;
  answerText.textContent = ep.answer;
  openEpisodeBtn.href = ep.url;

  const version = encodeURIComponent(ep.published_at || ep.date || Date.now());
  heroImage.src = `${ep.image || '/assets/social.jpg'}?v=${version}`;
  heroImage.alt = ep.imageAlt || ep.title;

  document.getElementById('shareBtn').onclick = async () => {
    const shareData = {
      title: ep.title,
      text: `${ep.question} — ${ep.answer}`,
      url: new URL(ep.url, location.origin).toString()
    };
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    alert('Link copiato negli appunti.');
  };
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  const data = await loadSite();
  renderCurrent(data.current);

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      alert('Su iPhone usa Safari e scegli “Aggiungi alla schermata Home”. Su Android usa “Installa app”.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });
}

init().catch(error => {
  console.error(error);
  document.getElementById('episodeTitle').textContent = 'Impossibile caricare l’episodio';
});
