let deferredInstallPrompt = null;

async function loadSite() {
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('site.json non disponibile');
  return res.json();
}

function renderCurrent(ep) {
  const title = document.getElementById('episodeTitle');
  const summary = document.getElementById('episodeSummary');
  const sourceLine = document.getElementById('sourceLine');
  const newsHeadline = document.getElementById('newsHeadline');
  const newsText = document.getElementById('newsText');
  const questionText = document.getElementById('questionText');
  const answerText = document.getElementById('answerText');
  const openEpisodeBtn = document.getElementById('openEpisodeBtn');
  const heroImage = document.getElementById('heroImage');

  if (!ep) {
    title.textContent = 'Nessun episodio pubblicato';
    summary.textContent = 'L’infrastruttura è pronta ma non è ancora stato pubblicato alcun episodio.';
    sourceLine.textContent = '';
    openEpisodeBtn.href = '/archive/';
    openEpisodeBtn.textContent = 'Apri archivio';
    return;
  }

  title.textContent = ep.title;
  summary.textContent = ep.summary;
  sourceLine.textContent = `Fonte: ${ep.source.name} · ${ep.date}`;
  newsHeadline.textContent = ep.headline;
  newsText.textContent = ep.news_text;
  questionText.textContent = ep.question;
  answerText.textContent = ep.answer;
  openEpisodeBtn.href = ep.url;
  heroImage.src = ep.image || '/assets/social.jpg';
  heroImage.alt = ep.imageAlt || ep.title;

  document.getElementById('shareBtn').onclick = async () => {
    const shareData = { title: ep.title, text: ep.summary, url: new URL(ep.url, location.origin).toString() };
    if (navigator.share) return navigator.share(shareData);
    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    alert('Link copiato negli appunti.');
  };
}

function renderArchive(items) {
  const list = document.getElementById('archiveList');
  list.innerHTML = '';
  for (const item of (items || []).slice(0, 5)) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${item.url}"><strong>${item.title}</strong><span>${item.date} · ${item.source.name}</span></a>`;
    list.appendChild(li);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);
  const data = await loadSite();
  renderCurrent(data.current);
  renderArchive(data.archive);

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

init().catch(console.error);
