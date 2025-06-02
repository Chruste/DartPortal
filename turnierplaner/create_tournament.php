<!-- create_tournament.php -->
<?php
//include '../db.php';

// Hole Zugangsdaten aus POST-Request
$mysqlHost = $_POST['mysqlHost'];
$mysqlDb   = $_POST['mysqlDb'];
$mysqlUser = $_POST['mysqlUser'];
$mysqlPass = $_POST['mysqlPass'];

$conn = new mysqli($mysqlHost, $mysqlUser, $mysqlPass, $mysqlDb);

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