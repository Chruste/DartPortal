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
    <label id="dbUserLabel" for="dbUser">DB-Benutzername:</label><br>
    <input type="text" id="dbUser" name="dbUser"><br>

    <label id="dbPasswordLabel" for="dbPassword">DB-Passwort:</label><br>
    <input type="password" id="dbPassword" name="dbPassword"><br>
  
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
        document.getElementById('dbUser').value = localStorage.getItem('dbUser') || '';
        document.getElementById('dbPassword').value = localStorage.getItem('dbPassword') || '';
      
      // Login-Maske nur einmalig anzeigen
      if(localStorage.getItem('dbUser') && localStorage.getItem('dbPassword')){
          document.getElementById('dbUser').style.display = 'none';
          document.getElementById('dbPassword').style.display = 'none';
          document.getElementById('dbUserLabel').style.display = 'none';
          document.getElementById('dbPasswordLabel').style.display = 'none';
      } else {
          document.getElementById('dbUser').style.display = 'block';
          document.getElementById('dbPassword').style.display = 'block';
          document.getElementById('dbUserLabel').style.display = 'block';
          document.getElementById('dbPasswordLabel').style.display = 'block';
      }
    };
  
    function createTournament() {
        const players = document.getElementById('players').value;
        const dbUser = document.getElementById('dbUser').value;
        const dbPassword = document.getElementById('dbPassword').value;

        // DB-Login speichern
        localStorage.setItem('dbUser', dbUser);
        localStorage.setItem('dbPassword', dbPassword);  
      
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
                 "&dbUser=" + encodeURIComponent(dbUser) + 
                 "&dbPassword=" + encodeURIComponent(dbPassword));
    }
</script>

</body>
</html>
<?php include '../footer.php'; ?>