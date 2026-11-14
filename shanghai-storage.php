<?php

declare(strict_types=1);

/**
 * BACKWARD COMPATIBILITY WRAPPER
 * 
 * Diese Datei leitet alle Anfragen an die moderne cloud-storage.php weiter.
 * Existiert nur für Backward-Kompatibilität.
 * 
 * Neue Spiele und Code sollten cloud-storage.php direkt verwenden.
 */

require __DIR__ . '/cloud-storage.php';
