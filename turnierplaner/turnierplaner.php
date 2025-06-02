<!-- turnierplaner.php -->
<!DOCTYPE html>
<?php include '../header.php'; ?>

<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Turnierplaner</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .tile-container { display: flex; gap: 20px; padding: 20px; }
        .tile {
            padding: 40px;
            background-color: #f0f0f0;
            cursor: pointer;
            border-radius: 8px;
            box-shadow: 2px 2px 6px rgba(0,0,0,0.1);
            text-align: center;
            flex: 1;
        }
    </style>
</head>
<body>

<div class="tile-container">
    <div class="tile" onclick="location.href='neues_turnier.php'">Neues Turnier</div>
    <div class="tile" onclick="location.href='historie.php'">Historie</div>
</div>

</body>
</html>

<?php include '../footer.php'; ?>