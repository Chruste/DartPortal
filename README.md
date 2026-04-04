# DartPortal
Chrustes Scolia Dart Portal

## Google Login Setup

Der Login laeuft jetzt ueber Google OAuth 2.0 und serverseitige PHP-Sessions.

### 1. Google OAuth konfigurieren

1. In der Google Cloud Console ein OAuth 2.0 Client (Webanwendung) erstellen.
2. Als Redirect URI eintragen: `https://chruste.de.cool/google-callback.php`
3. Client ID und Secret notieren.

### 2. Umgebungsvariablen auf dem Server setzen

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_BASE_URL` (z. B. `https://chruste.de.cool`)
- `DB_HOST` (optional, default: `localhost`)
- `DB_NAME` (optional, default: `db_447002_1`)
- `DB_USER` (Pflicht)
- `DB_PASS` (Pflicht)
- `USER_DB_HOST` (optional, default: `localhost`)
- `USER_DB_NAME` (optional, default: `db_447002_2`)
- `USER_DB_USER` (Pflicht fuer Portal-DB)
- `USER_DB_PASS` (Pflicht fuer Portal-DB)

Wenn dein Hosting keine echten Umgebungsvariablen anbietet, kannst du stattdessen eine Secret-Datei `dartportal_auth.php` verwenden.

Unterstuetzte Pfade (in Reihenfolge):

1. Pfad aus `DARTPORTAL_AUTH_SECRETS_FILE`
2. `../secrets/dartportal_auth.php` relativ zum `DOCUMENT_ROOT`
3. `../secrets/dartportal_auth.php` relativ zum Projektverzeichnis
4. `private_config/dartportal_auth.php` im Projekt (nur mit HTTP-Sperre per `.htaccess`)

Dateiformat:

```php
<?php
return [
	'google_client_id' => '...',
	'google_client_secret' => '...',
	'app_base_url' => 'https://chruste.de.cool',
	'db_host' => 'localhost',
	'db_name' => 'db_447002_1',
	'db_user' => '...',
	'db_pass' => '...',
	'user_db_host' => 'localhost',
	'user_db_name' => 'db_447002_2',
	'user_db_user' => 'USER447002_user',
	'user_db_pass' => '...',
];
```

### 3. Datenbank

Die Tabelle `oauth_users` auf DB "..._1" sowie die Tabellen `portal_users` und `friendships` auf DB "..._2" muessen vorab in MySQL existieren, da `google-callback.php`  
Benutzer dort anlegt oder aktualisiert und das Freunde-System die Portal-DB nutzt.
Migration:

`migrations/20260328_oauth_users.sql`

`migrations/20260402_portal_users.sql` 

`migrations/20260404_friendships.sql`

### 4. Login-Fluss

1. Nutzer klickt auf `Mit Google anmelden` in `/login.php`
2. Redirect zu Google OAuth Consent
3. Callback nach `/google-callback.php`
4. User wird in `oauth_users` und `portal_users` angelegt oder aktualisiert
5. Session wird gesetzt und Nutzer zu `/index.php` weitergeleitet
