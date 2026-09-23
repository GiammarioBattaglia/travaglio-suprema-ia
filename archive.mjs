async function init() {
  const res = await fetch('/data/site.json', { cache: 'no-store' });
  const data = await res.json();
  const list = document.getElementById('archivePageList');
  list.innerHTML = '';
  for (const item of data.all || []) {
    const li = document.createElement('li');
    li.innerHTML = `
      <a class="item-link" href="${item.url}">
        <strong>${item.title}</strong>
        <div class="small-muted">${item.date} · ${item.source.name}</div>
        <div class="item-summary">${item.summary}</div>
      </a>`;
    list.appendChild(li);
  }
}

init().catch(console.error);
