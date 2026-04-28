// Service Worker registrieren
if ('serviceWorker' in navigator) {
  let hasRefreshed = false;
  const portalAssetVersion = window.PORTAL_ASSET_VERSION || 'dev';
  const serviceWorkerUrl = `/sw.js?v=${encodeURIComponent(portalAssetVersion)}`;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasRefreshed) {
      return;
    }

    hasRefreshed = true;
    window.location.reload();
  });

  navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: 'none' })
    .then(registration => {
      console.log('SW registriert');

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    })
    .catch(err => console.error('SW-Fehler:', err));
}

// Portal JS: Sidebar & Topbar

const PORTAL_ZOOM_STORAGE_KEY = 'portal:page-zoom';
const PORTAL_ZOOM_STEP = 0.1;
const PORTAL_ZOOM_MIN = 0.2;
const PORTAL_ZOOM_MAX = 1;

function normalizePortalZoom(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.min(PORTAL_ZOOM_MAX, Math.max(PORTAL_ZOOM_MIN, Math.round(numericValue * 10) / 10));
}

function getStoredPortalZoom() {
  return normalizePortalZoom(window.localStorage.getItem(PORTAL_ZOOM_STORAGE_KEY) || 1);
}

function applyPortalZoom(zoomLevel) {
  const normalizedZoom = normalizePortalZoom(zoomLevel);
  document.documentElement.style.zoom = String(normalizedZoom);
  window.localStorage.setItem(PORTAL_ZOOM_STORAGE_KEY, String(normalizedZoom));

  // Topbar und Sidebar auf 100% halten indem der Zoom "rückgängig" gemacht wird
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    topbar.style.zoom = String(1 / normalizedZoom);
  }

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.style.zoom = String(1 / normalizedZoom);
  }

  const zoomPercent = Math.round(normalizedZoom * 100);
  const zoomOutBtn = document.getElementById('topbarZoomOutButton');
  const zoomResetBtn = document.getElementById('topbarZoomResetButton');
  const zoomInBtn = document.getElementById('topbarZoomInButton');

  if (zoomOutBtn) {
    zoomOutBtn.disabled = normalizedZoom <= PORTAL_ZOOM_MIN;
    zoomOutBtn.title = `Ansicht verkleinern (aktuell ${zoomPercent}%)`;
    zoomOutBtn.setAttribute('aria-label', zoomOutBtn.title);
  }

  if (zoomResetBtn) {
    zoomResetBtn.disabled = normalizedZoom === 1;
    zoomResetBtn.title = `Ansicht auf 100 Prozent zuruecksetzen (aktuell ${zoomPercent}%)`;
    zoomResetBtn.setAttribute('aria-label', zoomResetBtn.title);
  }

  if (zoomInBtn) {
    zoomInBtn.disabled = normalizedZoom >= PORTAL_ZOOM_MAX;
    zoomInBtn.title = `Ansicht vergroessern (aktuell ${zoomPercent}%)`;
    zoomInBtn.setAttribute('aria-label', zoomInBtn.title);
  }
}

function changePortalZoom(delta) {
  const currentZoom = getStoredPortalZoom();
  applyPortalZoom(currentZoom + delta);
}

function closeSidebar(sidebar) {
  if (!sidebar) return;

  if (window.innerWidth < 600) {
    sidebar.classList.remove('visible');
    return;
  }

  sidebar.classList.add('collapsed');
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const desktopBtn = document.getElementById('toggleSidebar');
  const mobileBtn = document.getElementById('mobileMenuButton');
  const zoomOutBtn = document.getElementById('topbarZoomOutButton');
  const zoomResetBtn = document.getElementById('topbarZoomResetButton');
  const zoomInBtn = document.getElementById('topbarZoomInButton');
  const refreshBtn = document.getElementById('topbarRefreshButton');

  applyPortalZoom(getStoredPortalZoom());

  // Desktop: toggle collapse
  if (desktopBtn && sidebar) {
    desktopBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Mobile: toggle visibility
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('visible');
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      changePortalZoom(-PORTAL_ZOOM_STEP);
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      applyPortalZoom(1);
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      changePortalZoom(PORTAL_ZOOM_STEP);
    });
  }

  // Close mobile sidebar on link click
  document.querySelectorAll('#sidebar nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 600) {
        sidebar.classList.remove('visible');
      }
    });
  });

  document.addEventListener('click', event => {
    if (!sidebar) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (sidebar.contains(target) || desktopBtn?.contains(target) || mobileBtn?.contains(target)) {
      return;
    }

    const isMobileOpen = window.innerWidth < 600 && sidebar.classList.contains('visible');
    const isDesktopOpen = window.innerWidth >= 600 && !sidebar.classList.contains('collapsed');
    if (isMobileOpen || isDesktopOpen) {
      closeSidebar(sidebar);
    }
  });
});