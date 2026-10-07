# Murmelflug

Mathe-Lernspiel für Kinder (8–14). Jede richtige Aufgabe bringt die Glasmurmel auf einer Spiralbahn ein Level höher – von der Erde bis zum Schwarzen Loch. Optimiert für Tablets.

Reine statische Website: keine Datenbank, kein Build-Schritt, keine externen Dienste. three.js und die Schrift liegen lokal im Projekt (keine Google-Fonts-Anbindung).

## Struktur

```
index.html            Oberfläche und Styles
js/game.js            Spiellogik, Aufgaben, Werkstatt, Statistik, Codes
js/world.js           3D-Welt: Bahn, Umgebungen, Glasmurmel, Enden
vendor/three/         three.js r186 (lokal)
fonts/                Baloo 2 (lokal, SIL Open Font License)
icon.svg, icon-180.png
.htaccess             MIME-Typen, Komprimierung, Caching
.github/workflows/    optionaler Auto-Deploy per FTP
```

## Lokal testen

Die Seite nutzt ES-Module und muss über einen Webserver laufen (nicht per Doppelklick):

```
python3 -m http.server 8000
```
Dann `http://localhost:8000` öffnen.

## Deploy auf netcup über Git

### Variante A: GitHub + automatischer FTP-Upload
1. Repository auf GitHub anlegen und den Ordnerinhalt pushen.
2. Im Repo unter *Settings → Secrets and variables → Actions* anlegen: `FTP_SERVER`, `FTP_USER`, `FTP_PASSWORD`, `FTP_DIR` (Daten aus dem netcup WCP).
3. Jeder Push auf `main` lädt die Dateien hoch (`.github/workflows/deploy.yml`).

### Variante B: SSH direkt auf dem Webspace (falls im Tarif enthalten)
```
cd ~/httpdocs            # bzw. Ordner der (Sub-)Domain
git clone <repo-url> murmelflug
# Updates später:
cd murmelflug && git pull
```

Empfehlung: eigene Subdomain (z. B. `murmelflug.deine-domain.de`) mit HTTPS (Let's Encrypt im WCP).

## Spielstand

Wird im Browser (localStorage) des jeweiligen Geräts gespeichert. Übertragen auf ein anderes Gerät: Startbildschirm → *Spielstand* → Text kopieren und auf dem anderen Gerät einfügen. Konten/Profile sind für später vorgesehen.

## Eltern

Startbildschirm → *Eltern*: PIN festlegen, Freischalt-Codes erstellen, Statistik ansehen, alles zurücksetzen. Codes funktionieren offline auf jedem Gerät und sind je Spielstand einmal einlösbar. Exklusive Items gibt es nur durch Level 60.

Das Geheimwort für Codes steht in `js/game.js` (`SECRET`). Wird es geändert, werden alle bisherigen Codes ungültig.

## Auf dem iPad wie eine App

In Safari öffnen → Teilen → *Zum Home-Bildschirm*. Startet dann im Vollbild.
