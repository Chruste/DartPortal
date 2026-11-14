# CDP - Chrustes Dart Portal

Chrustes webbasiertes Dart Portal mit den exklusiven Spielen **Shanghai 21**, **Shanghai 42**!

Außerdem: **Scolia-API-Anbindung**, **Google-Login** und **Freunde-System**.

Die Anwendung besteht aus klassischem **PHP + MySQL + Vanilla JS/CSS** ohne Build-Schritt. Ein Service Worker cached statische Assets; Versionswechsel werden beim Deploy automatisch über die Dateizeit erkannt.

---

## Features im Überblick

- **Google OAuth 2.0 Login** mit serverseitigen PHP-Sessions
- Spielmodi: **Shanghai 21** und **Shanghai 42**
- **Scolia-API-Anbindung** für automatische Wurf-Erkennung
- **Lokale und Cloud-Speicherstände** für die Shanghai-Spiele
- **Archivieren / Schreibschutz** für gespeicherte Spielstände
- **Profil & Freunde** inklusive Freundschaftsverwaltung
- **Dartball** als weiteres Spielmodul (aktuell noch Platzhalter)
- **Turnierplaner** als separates Tool (aktuell noch Platzhalter)
- **PWA-/Service-Worker-Cache** für schnellere Ladezeiten

---

## Projektstruktur

```text
/
├── index.php                  # Startseite / Navigation
├── login.php                  # Google-Login Einstieg
├── google-login.php           # Start des OAuth-Flows
├── google-callback.php        # OAuth-Callback
├── session_bootstrap.php      # Session, HTTPS, Asset-Versionierung
├── header.php / footer.php    # Gemeinsames Layout
├── portal.js / portal.css     # Globale UI / SW-Registrierung
├── sw.js                      # Service Worker / Asset-Cache
├── cloud-storage.php          # Cloud-Speicher API (generisch für alle Spiele)
├── shanghai-storage.php       # Wrapper für Backward-Kompatibilität zu cloud-storage.php
├── scolia-config.php          # Laden von Scolia-Zugangsdaten
├── save-scolia-config.php     # Speichern von Scolia-Zugangsdaten
├── profil/                    # Profil- und Freunde-Bereich
├── shanghai21/                # Shanghai 21
├── shanghai42/                # Shanghai 42
├── dartball/                  # Dartball
├── darts501/                  # 501 Darts
├── turnierplaner/             # Turnierplaner
└── migrations/                # SQL-Migrationen
```

---

## Voraussetzungen

- **PHP 8.0+**
- **MySQL/MariaDB**
- Webserver mit PHP-Unterstützung
- **Google OAuth Client** für den Login
- Für Produktivbetrieb: **HTTPS** empfohlen/erwartet

> Lokal kann HTTPS mit `APP_ENFORCE_HTTPS=0` deaktiviert werden.

---

## Schnellstart lokal

### 1. Repository bereitstellen
Projekt ins Webroot oder in ein lokales Arbeitsverzeichnis legen.

### 2. Datenbanken anlegen
Je nach Hosting werden aktuell zwei DB-Kontexte verwendet:

- DB 1: **Auth-/App-DB** (`DB_*`) für OAuth-Login und Scolia-API-Token
- DB 2: **Portal-DB** (`USER_DB_*`) für Profil, Freunde und Spielstände

### 3. Migrationen ausführen
Die SQL-Dateien im Ordner `migrations/` in sinnvoller (chronologischer) Reihenfolge importieren:

| Datei | Zweck | DB |
|---|---|---|
| `20260328_oauth_users.sql` | Google-OAuth-Benutzer |  1 |
| `20260402_portal_users.sql` | Portal-Profile / Benutzerbasis | 2 |
| `20260403_scolia_config.sql` | Scolia-Seriennummer + API-Token | 1 |
| `20260404_friendships.sql` | Freundschaftsbeziehungen | 2 |
| `20260407_shanghai_saved_games.sql` | Cloud-Spielstände für Shanghai 21/42 | 2 |
| `20260408_shanghai_archive_state.sql` | Archiv-/Schreibschutzstatus von Spielständen | 2 |
| `20260428_darts501_saved_games.sql` | Neues Spiel Darts 501 | 2 |

### 4. Konfiguration setzen
Entweder über echte Umgebungsvariablen **oder** über eine Secret-Datei.

### 5. Lokalen Server starten
Beispiel mit PHP Built-in Server:

```bash
APP_ENFORCE_HTTPS=0 php -S 127.0.0.1:8080 -t .
```

Dann im Browser öffnen:

```text
http://127.0.0.1:8080/login.php
```

---

## Konfiguration

### Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---:|---|
| `GOOGLE_CLIENT_ID` | ja | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ja | OAuth Client Secret |
| `APP_BASE_URL` | ja | Basis-URL, z. B. `https://chruste.de.cool` |
| `APP_ENFORCE_HTTPS` | nein | Standard `1`; lokal meist `0` |
| `DB_HOST` | nein | Default `localhost` |
| `DB_NAME` | nein | Default `db_1` |
| `DB_USER` | ja | DB-User für Auth-/App-DB |
| `DB_PASS` | ja | Passwort für Auth-/App-DB |
| `USER_DB_HOST` | nein | Default `localhost` |
| `USER_DB_NAME` | nein | Default `db_2` |
| `USER_DB_USER` | ja | DB-User für Portal-DB |
| `USER_DB_PASS` | ja | Passwort für Portal-DB |

### Alternative: Secret-Datei

Wenn dein Hosting keine echten Umgebungsvariablen anbietet, kann stattdessen `dartportal_auth.php` verwendet werden.

Unterstützte Pfade (in Reihenfolge):

1. Pfad aus `DARTPORTAL_AUTH_SECRETS_FILE`
2. `../secrets/dartportal_auth.php` relativ zum `DOCUMENT_ROOT`
3. `../secrets/dartportal_auth.php` relativ zum Projektverzeichnis
4. `private_config/dartportal_auth.php` im Projekt *(nur mit HTTP-Sperre, z. B. `.htaccess`)*

Beispiel für die Secret-Datei:

```php
<?php
return [
    'google_client_id' => '...',
    'google_client_secret' => '...',
    'app_base_url' => 'https://chruste.de.cool',
    'db_host' => 'localhost',
    'db_name' => 'db_1',
    'db_user' => '...',
    'db_pass' => '...',
    'user_db_host' => 'localhost',
    'user_db_name' => 'db_2',
    'user_db_user' => '...',
    'user_db_pass' => '...',
];
```

---

## Google Login Setup

### 1. OAuth-Client in Google Cloud anlegen
1. In der Google Cloud Console einen **OAuth 2.0 Client (Webanwendung)** erstellen
2. Redirect URI hinterlegen, z. B.:
   - `https://chruste.de.cool/google-callback.php`
3. Client ID und Secret in den Env-Werten oder den Secret-Dateien übernehmen

### 2. Basis-URL korrekt setzen
`APP_BASE_URL` muss exakt zur tatsächlichen Seite passen, sonst scheitert der Redirect-Flow.

### 3. Login-Fluss
1. Nutzer klickt auf `Mit Google anmelden` in `login.php`
2. Redirect zu Google OAuth Consent
3. Callback nach `google-callback.php`
4. Benutzer wird in `oauth_users` und `portal_users` angelegt/aktualisiert
5. Session wird gesetzt und Redirect auf `index.php`

---

## Spiele / Speicherstände

Die Spiel-Module unterstützen:

**Lokales Spiel** im Browser (beim Aktualisieren der Seite oder Schließen des Browsers sind die bisherigen Spieldaten weg)

**Cloud-Spielstände** für eingeloggte Nutzer
- **Speicherstand umbenennen**
- **Kopieren / Laden / Löschen**
- **Archivieren (schreibgeschützt)**
- **Teilnehmer-/Freunde-Metadaten** pro Spielstand

Die zugehörige Server-API liegt in:

- `cloud-storage.php` — Generische Multiplayer-Speicher-API für Spielstände
  - Unterstützt Shanghai 21, Shanghai 42 und klassisches 501 Darts
  - Verwaltet Sessions, Participants, Events
  - Handling von Freundes-Einladungen
- `shanghai-storage.php` — Wrapper für Backward-Kompatibilität (leitet zu cloud-storage.php)

Scolia-Zugangsdaten werden pro Benutzer geladen/gespeichert über:

- `scolia-config.php`
- `save-scolia-config.php`

---

## Deployment- und Cache-Hinweise

### Service Worker / Cache
- `sw.js` cached statische Assets für das Portal
- Die Asset-Version wird automatisch aus dem **letzten Änderungsdatum der Projektdateien** erzeugt (`YYYYMMDDHHMMSS`)
- Nach einem Deploy wird daher beim nächsten normalen Seitenaufruf bzw. Fokus in der Regel die neue Version geladen

> Ein manuelles `STRG+F5` sollte normalerweise **nicht** nötig sein.

### HTTPS
- Im Produktivbetrieb ist HTTPS vorgesehen
- Für lokale Entwicklung kann die Weiterleitung über `APP_ENFORCE_HTTPS=0` deaktiviert werden

### Error Logging
- Serverseitige Fehler werden zentral über `portal_log_error(...)` protokolliert
- Standard-Ziellogdatei: `private_config/dartportal_error.log`
- Wenn die Datei bzw. das Verzeichnis nicht beschreibbar ist, wird automatisch auf PHP-`error_log` zurückgefallen
- Log-Rotation ist eingebaut, damit die Datei nicht unendlich wächst

> Auf Produktivsystemen sollte `private_config/` nicht öffentlich per HTTP erreichbar sein.

---

## Troubleshooting

### Google-Login funktioniert nicht
Prüfen:
- stimmen `GOOGLE_CLIENT_ID` und `GOOGLE_CLIENT_SECRET`?
- stimmt `APP_BASE_URL` exakt?
- ist die Redirect URI in Google korrekt hinterlegt?

### Seite leitet lokal immer auf HTTPS um
Setze lokal:

```bash
APP_ENFORCE_HTTPS=0
```

### DB-Fehler / leere Daten
Prüfen:
- DB-Zugangsdaten korrekt?
- alle Migrationen importiert?
- richtige DB für `DB_*` und `USER_DB_*` verwendet?

### Alte Assets trotz Deploy
Normalerweise reicht ein normaler Reload. Falls ein Browser-Tab lange offen war, kurz neu laden oder erneut auf die Seite wechseln.

---

## Hinweise für den Betrieb

- Secrets möglichst **nicht im Webroot** ablegen
- Falls `private_config/` genutzt wird, Zugriff per Server-Konfiguration sperren
- Vor Deployments Datenbank-Migrationen zuerst einspielen, danach Code aktualisieren
