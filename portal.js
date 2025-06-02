// Service Worker registrieren
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('SW registriert'))
    .catch(err => console.error('SW-Fehler:', err));
}

// Portal JS: Sidebar & Topbar

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const desktopBtn = document.getElementById('toggleSidebar');
  const mobileBtn = document.getElementById('mobileMenuButton');
  const mysqlHost = localStorage.getItem('mysqlHost');
  const mysqlDb = localStorage.getItem('mysqlDb');
  const mysqlUser = localStorage.getItem('mysqlUser');
  const mysqlPass = localStorage.getItem('mysqlPass');

  if(mysqlHost && mysqlDb && mysqlUser && mysqlPass) {
    fetch('check_db_connection.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            mysqlHost: mysqlHost,
            mysqlDb: mysqlDb,
            mysqlUser: mysqlUser,
            mysqlPass: mysqlPass
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        if(data.success){
            // Verbindung klappt: username setzen
            fetch('set_session_username.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({mysqlUser: mysqlUser})
            });
        }
    })
    .catch(error => {
        console.error('Fehler bei DB-Verbindung:', error);
    });
    } else {
    console.warn("DB-Zugangsdaten fehlen. Bitte unter Einstellungen einloggen.");
    }

  // Desktop: toggle collapse
  desktopBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  // Mobile: toggle visibility
  mobileBtn.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
  });

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