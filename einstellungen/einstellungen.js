document.addEventListener('DOMContentLoaded', function() {
    // Laden aus LocalStorage
    document.getElementById('scoliaSerial').value = localStorage.getItem('scoliaSerial') || '';
    document.getElementById('scoliaToken').value = localStorage.getItem('scoliaToken') || '';

    // Speichern im LocalStorage
    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();

        localStorage.setItem('scoliaSerial', document.getElementById('scoliaSerial').value);
        localStorage.setItem('scoliaToken', document.getElementById('scoliaToken').value);

        alert('Einstellungen erfolgreich gespeichert!');
    });
});