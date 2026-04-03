// Service Worker registrieren
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('SW registriert'))
    .catch(err => console.error('SW-Fehler:', err));
}

// Portal JS: Sidebar & Topbar

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const desktopBtn = document.getElementById('toggleSidebar');
  const mobileBtn = document.getElementById('mobileMenuButton');

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

  // Close mobile sidebar on link click
  document.querySelectorAll('#sidebar nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 600) {
        sidebar.classList.remove('visible');
      }
    });
  });

  // Navigation with title update
  document.querySelectorAll('#sidebar nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const title = link.dataset.title;
      document.getElementById('pageTitle').textContent = title;
      window.location.href = link.href;
    });
  });
});