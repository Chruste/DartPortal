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
- `DB_NAME` (optional, default: `db_447002_2`)
- `DB_USER` (Pflicht)
- `DB_PASS` (Pflicht)

### 3. Datenbank

Die Tabelle `oauth_users` muss vorab in MySQL existieren.
Migration:

`migrations/20260328_oauth_users.sql`

### 4. Login-Fluss

1. Nutzer klickt auf `Mit Google anmelden` in `/login.php`
2. Redirect zu Google OAuth Consent
3. Callback nach `/google-callback.php`
4. User wird in `oauth_users` angelegt oder aktualisiert
5. Session wird gesetzt und Nutzer zu `/index.php` weitergeleitet
