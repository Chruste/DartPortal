// DB-Login logic
document.getElementById('btnLogin')
  .addEventListener('click', async () => {
    const user = document.getElementById('dbUser').value.trim();
    const pass = document.getElementById('dbPass').value.trim();
    if (!user || !pass) return alert('Bitte DB-Zugangsdaten eingeben');
    const res = await fetch('/login-api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbUser: user, dbPass: pass })
    });
    const json = await res.json();
    document.getElementById('output').textContent =
      JSON.stringify(json, null, 2);
    if (json.success) {
      sessionStorage.setItem('username', json.user.Name);
      location.reload();
    }
  });