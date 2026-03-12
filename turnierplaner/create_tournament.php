<!-- create_tournament.php -->
<?php
//include '../db.php';

$host  = 'chruste.lima-db.de';
$db    = 'db_447002_2';
// Hole Zugangsdaten aus POST-Request
$user = $_POST['dbUser'];
$pw = $_POST['dbPassword'];

$conn = new mysqli($host, $user, $pw, $db);

if ($conn->connect_error) {
    die("Fehler bei Verbindung zur Datenbank: " . $conn->connect_error);
}

$players = intval($_POST['players']);
$name = "Turnier vom " . date('d.m.Y H:i:s');

$sql = $conn->prepare("INSERT INTO tournament (Players, Name) VALUES (?, ?)");
$sql->bind_param("is", $players, $name);

if ($sql->execute()) {
    echo "Neues Turnier erfolgreich erstellt.";
} else {
    echo "Fehler beim Erstellen des Turniers: " . $conn->error;
}

$conn->close();
?>