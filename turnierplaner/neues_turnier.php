<!-- neues_turnier.php -->
<!DOCTYPE html>
<?php include '../header.php'; ?>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neues Turnier erstellen</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        select, button { padding: 10px; margin-top: 10px; }
        button { background-color: #4CAF50; color: white; border: none; cursor: pointer; }
    </style>
</head>
<body>

<h2>Neues Turnier erstellen</h2>

<form id="tournamentForm">
        <label for="players">Anzahl Teilnehmer:</label><br>
    <select id="players" name="players">
        <?php for($i=3; $i<=32; $i++): ?>
            <option value="<?php echo $i; ?>"> <?php echo $i; ?> </option>
        <?php endfor; ?>
    </select><br>
    <button type="button" onclick="createTournament()">Turnier erstellen</button>
</form>

<script>
    // Lade DB-Login aus Local Storage
    window.onload = function() {
        document.getElementById('mysqlHost').value = localStorage.getItem('mysqlHost') || '';
        document.getElementById('mysqlDb').value   = localStorage.getItem('mysqlDb') || '';
        document.getElementById('mysqlUser').value = localStorage.getItem('mysqlUser') || '';
        document.getElementById('mysqlPass').value = localStorage.getItem('mysqlPass') || '';
    };
  
    function createTournament() {
        const players   = document.getElementById('players').value;
        const mysqlHost = document.getElementById('mysqlHost').value;
        const mysqlDb   = document.getElementById('mysqlDb').value;
        const mysqlUser = document.getElementById('mysqlUser').value;
        const mysqlPass = document.getElementById('mysqlPass').value;
      
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "create_tournament.php", true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.onload = function() {
            if (xhr.status === 200) {
                alert(xhr.responseText);
            } else {
                alert('Verbindung zum Server fehlgeschlagen.');
            }
        };
        xhr.send("players=" + encodeURIComponent(players) +
                 "&mysqlHost=" + encodeURIComponent(mysqlHost) +
                 "&mysqlDb=" + encodeURIComponent(mysqlDb) + 
                 "&mysqlUser=" + encodeURIComponent(mysqlUser) + 
                 "&mysqlPass=" + encodeURIComponent(mysqlPass));
    }
</script>

</body>
</html>
<?php include '../footer.php'; ?>