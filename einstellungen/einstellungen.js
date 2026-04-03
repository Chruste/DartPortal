document.addEventListener('DOMContentLoaded', function() {
    const statusEl = document.getElementById('scolia-status');

    // Gespeicherte Werte vom Server laden
    fetch('/scolia-config.php')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                document.getElementById('scoliaSerial').value = data.serialNumber;
                document.getElementById('scoliaToken').value = data.accessToken;
                statusEl.textContent = 'Gespeicherte Konfiguration geladen.';
            }
        })
        .catch(() => {});

    // Speichern in DB
    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const serial = document.getElementById('scoliaSerial').value.trim();
        const token  = document.getElementById('scoliaToken').value.trim();

        fetch('/save-scolia-config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serialNumber: serial, accessToken: token })
        })
        .then(r => r.json())
        .then(data => {
            statusEl.textContent = data.message;
        })
        .catch(() => {
            statusEl.textContent = 'Fehler beim Speichern.';
        });
    });
});