let deferredInstallPrompt = null;

async function loadEpisodes() {
  try {
    const res = await fetch('/data/episodes.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Archivio non disponibile');
    return await res.json();
  } catch (err) {
    console.error(err);
    return { current: null, archive: [] };
  }
}

function renderCurrent(ep) {
  const title = document.getElementById('episodeTitle');
  const summary = document.getElementById('episodeSummary');
  const sourceLine = document.getElementById('sourceLine');
  const newsHeadline = document.getElementById('newsHeadline');
  const newsText = document.getElementById('newsText');
  const questionText = document.getElementById('questionText');
  const answerText = document.getElementById('answerText');

  if (!ep) {
    title.textContent = 'Nessun episodio disponibile';
    summary.textContent = 'Lo starter è pronto ma l’episodio del giorno non è ancora stato definito.';
    sourceLine.textContent = '';
    return;
  }

  title.textContent = ep.title;
  summary.textContent = ep.summary;
  sourceLine.textContent = `Fonte: ${ep.source} · ${ep.date}${ep.url ? ' · link originale disponibile' : ''}`;
  newsHeadline.textContent = ep.headline;
  newsText.textContent = ep.news_text;
  questionText.textContent = ep.question;
  answerText.textContent = ep.answer;

  document.getElementById('shareBtn').onclick = async () => {
    const shareData = {
      title: 'Travaglio & la Suprema IA',
      text: `${ep.title} — ${ep.question}`,
      url: location.href
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      alert('Link copiato negli appunti.');
    }
  };
}

function renderArchive(items) {
  const list = document.getElementById('archiveList');
  list.innerHTML = '';
  for (const item of items || []) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.title}</strong><span>${item.date} · ${item.source}</span>`;
    list.appendChild(li);
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  const data = await loadEpisodes();
  renderCurrent(data.current);
  renderArchive(data.archive);

  document.getElementById('openEpisodeBtn').addEventListener('click', () => {
    document.querySelector('.episode-grid')?.scrollIntoView({ behavior: 'smooth' });
  });

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

init();
