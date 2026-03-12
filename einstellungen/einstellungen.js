document.addEventListener('DOMContentLoaded', function() {
    // Laden aus LocalStorage
    document.getElementById('scoliaSerial').value = localStorage.getItem('scoliaSerial') || '';
    document.getElementById('scoliaToken').value = localStorage.getItem('scoliaToken') || '';
    document.getElementById('mysqlHost').value = localStorage.getItem('mysqlHost') || '';
    document.getElementById('mysqlDb').value = localStorage.getItem('mysqlDb') || '';
    document.getElementById('mysqlUser').value = localStorage.getItem('mysqlUser') || '';
    document.getElementById('mysqlPass').value = localStorage.getItem('mysqlPass') || '';

    // Speichern im LocalStorage
    document.getElementById('settings-form').addEventListener('submit', function(e) {
        e.preventDefault();

        localStorage.setItem('scoliaSerial', document.getElementById('scoliaSerial').value);
        localStorage.setItem('scoliaToken', document.getElementById('scoliaToken').value);
        localStorage.setItem('mysqlHost', document.getElementById('mysqlHost').value);
        localStorage.setItem('mysqlDb', document.getElementById('mysqlDb').value);
        localStorage.setItem('mysqlUser', document.getElementById('mysqlUser').value);
        localStorage.setItem('mysqlPass', document.getElementById('mysqlPass').value);

        alert('Einstellungen erfolgreich gespeichert!');
    });
});