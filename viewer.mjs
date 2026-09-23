function initImageViewer() {
  const viewer = document.getElementById('imageViewer');
  if (!viewer) return;

  const mainImage = document.getElementById('heroImage');
  const viewerImage = document.getElementById('viewerImage');
  const openButton = document.getElementById('zoomBtn');
  const closeButton = document.getElementById('viewerCloseBtn');
  const backdrop = document.getElementById('viewerBackdrop');
  const zoomIn = document.getElementById('viewerZoomIn');
  const zoomOut = document.getElementById('viewerZoomOut');
  const reset = document.getElementById('viewerReset');
  let scale = 1;

  function applyScale() {
    viewerImage.style.transform = `scale(${scale})`;
    viewerImage.dataset.scale = String(scale);
  }

  function openViewer() {
    if (!mainImage?.src) return;
    viewerImage.src = mainImage.src;
    viewerImage.alt = mainImage.alt || 'Vignetta ingrandita';
    scale = 1;
    applyScale();
    viewer.hidden = false;
    document.body.classList.add('viewer-open');
    closeButton?.focus();
  }

  function closeViewer() {
    viewer.hidden = true;
    document.body.classList.remove('viewer-open');
    scale = 1;
    applyScale();
  }

  mainImage?.addEventListener('click', openViewer);
  mainImage?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openViewer();
    }
  });
  openButton?.addEventListener('click', openViewer);
  closeButton?.addEventListener('click', closeViewer);
  backdrop?.addEventListener('click', closeViewer);

  zoomIn?.addEventListener('click', () => {
    scale = Math.min(3, +(scale + .25).toFixed(2));
    applyScale();
  });
  zoomOut?.addEventListener('click', () => {
    scale = Math.max(.75, +(scale - .25).toFixed(2));
    applyScale();
  });
  reset?.addEventListener('click', () => {
    scale = 1;
    applyScale();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !viewer.hidden) closeViewer();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageViewer);
} else {
  initImageViewer();
}
