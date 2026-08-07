# Impresa Simoni — Istruzioni di installazione

Questa app è formata da tre parti:

1. **index.html** — l'app che usa il capocantiere dal telefono (giornate, cantieri, note/foto/audio)
2. **admin.html** — il pannello di amministrazione, pensato per essere aperto da browser/computer (gestione operai e cantieri)
3. **Code.gs** — lo script che fa da "database" e vive dentro un Google Sheet tuo, e gestisce anche l'archiviazione di foto/audio su Google Drive

⚠️ **Prima di tutto**: se stai migrando dalla vecchia app Android "Impresa Simoni" (App Inventor), **non riutilizzare** lo stesso service account/foglio. Quell'app impacchettava una chiave privata Google Cloud dentro l'APK, leggibile da chiunque estraesse il file — va considerata compromessa. Prima di procedere:
1. Vai su [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Trova il service account `appinventor@appinventor-410110.iam.gserviceaccount.com`
3. Elimina la sua chiave (Keys → elimina)

Questa nuova app non ne ha bisogno: usa Google Apps Script, che gira sotto il tuo account senza esporre nessuna credenziale.

---

## PARTE 1 — Creare il Google Sheet (il database)

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un nuovo foglio di calcolo vuoto.
2. Dagli un nome, ad esempio **"Impresa Simoni - Dati"**.
3. Menu **Estensioni → Apps Script**.
4. Cancella il contenuto di default e incolla tutto il contenuto di **Code.gs**.
5. Salva il progetto (icona dischetto o `Ctrl+S`), dagli un nome tipo "Impresa Simoni Backend".

### Pubblicare come Web App

6. **Esegui il deployment → Nuovo deployment**.
7. Icona ingranaggio ⚙️ → **App web**.
8. **Esegui come**: `Io (tua-email@gmail.com)` — **Chi ha accesso**: `Chiunque` (obbligatorio).
9. **Esegui il deployment**. La prima volta autorizza l'accesso (Impostazioni avanzate → Vai al progetto → Consenti).
10. Copia l'**URL dell'app web**, tipo `https://script.google.com/macros/s/AKfycb.../exec`.

> 💡 Ogni volta che modifichi `Code.gs`, devi rifare il deployment (Gestisci deployment → matita → Nuova versione → Esegui il deployment) perché l'URL pubblicato non si aggiorna da solo.

### Autorizzazione a Google Drive

La prima volta che l'app carica una foto o un audio, Apps Script chiederà anche l'autorizzazione ad accedere al tuo Google Drive (serve per creare la cartella "Impresa Simoni - Media" e salvarci i file). È normale, autorizza pure.

---

## PARTE 2 — Collegare le pagine web al backend

1. Apri **index.html** con un editor di testo, cerca:
   ```javascript
   const APPS_SCRIPT_URL = 'INCOLLA_QUI_IL_TUO_URL_APPS_SCRIPT';
   ```
   e incolla l'URL copiato prima. Mentre ci sei, valuta se cambiare anche:
   ```javascript
   const APP_PASSWORD = 'simoni2026';
   ```
   con una password a tua scelta (la condividi solo con il capocantiere).

2. Apri **admin.html**, cerca la stessa riga `APPS_SCRIPT_URL` e incolla **lo stesso URL**. Cambia anche:
   ```javascript
   const ADMIN_USER = 'admin';
   const ADMIN_PASS = 'admin';
   ```
   con credenziali tue.

3. Salva entrambi i file.

---

## PARTE 3 — Pubblicare su GitHub Pages

1. Crea (o riusa) un repository su GitHub, ad esempio `impresa-simoni-app`.
2. **Add file → Upload files**, carica **index.html** e **admin.html** (non serve caricare `Code.gs` né `ISTRUZIONI.md`, quelli restano solo per te).
3. Commit.
4. **Settings → Pages** → Source: `Deploy from a branch` → Branch `main`, cartella `/ (root)` → **Save**.
5. Dopo 1-2 minuti avrai due link:
   ```
   https://tuonomeutente.github.io/impresa-simoni-app/index.html   → app capocantiere
   https://tuonomeutente.github.io/impresa-simoni-app/admin.html   → pannello amministrazione
   ```

Consiglia al capocantiere di aggiungere il link di `index.html` alla schermata Home del telefono ("Aggiungi a schermata Home" dal browser), così si apre come un'icona a tutto schermo.

---

## PARTE 4 — Primo utilizzo

1. Apri **admin.html** dal computer, accedi, e vai su **Operai**: aggiungi i nomi della squadra.
2. Vai su **Cantieri**: aggiungi i cantieri attivi (puoi comunque aggiungerne di nuovi anche dall'app del telefono, al volo).
3. Il capocantiere apre **index.html** dal telefono, inserisce la password condivisa.
4. A fine giornata usa **"Inserisci giornata"**: data, cantiere, seleziona gli operai presenti con relative ore, lavorazioni e materiali.
5. Per aggiungere foto/audio/note relative a un cantiere in qualsiasi momento (non solo a fine giornata): **"Cantieri" → tocca il cantiere → pulsante "+"**.
6. Lo storico delle giornate si consulta e modifica da **"Quaderno cantieri"**, con filtri per cantiere/operaio/data.

---

## Dove finiscono i dati

- **Testi** (operai, cantieri, giornate, note): nel Google Sheet, fogli **Operai**, **Cantieri**, **Giornate**, **Note**.
- **Foto e audio**: su Google Drive, in una cartella **"Impresa Simoni - Media"**, con una sottocartella per ciascun cantiere. Il foglio **Media** tiene traccia di quale file appartiene a quale nota/cantiere.

Puoi sempre aprire lo Sheet e la cartella Drive a mano per controlli, backup o correzioni.

---

## Limiti e cose da sapere

- **Sicurezza "simbolica"**: come per Registro Ore, le password (app capocantiere e admin) sono scritte nel codice sorgente della pagina, visibile a chi guarda il repository. Va bene per uso interno con un piccolo gruppo di fiducia.
- **Repository pubblico**: se il repository GitHub è pubblico, chiunque può vedere il codice sorgente (comprese le password scelte). Per nasconderlo meglio serve un account GitHub a pagamento con repository privati.
- **Scritture concorrenti**: operai/cantieri/giornate vengono salvati sovrascrivendo l'intero foglio corrispondente. Per un solo capocantiere/amministratore che usano l'app non in contemporanea stretta, non è un problema pratico.
- **Foto/audio**: caricati direttamente su Drive tramite Apps Script; niente Google Photos, che dal 2025 non permette più questo tipo di integrazione automatica a app di terze parti.
- **Registrazione audio**: richiede che il browser del telefono conceda il permesso al microfono la prima volta.

---

## Riepilogo file

| File | Dove va |
|---|---|
| `index.html` | Caricato su GitHub Pages — app capocantiere |
| `admin.html` | Caricato su GitHub Pages — pannello amministrazione |
| `Code.gs` | Incollato nell'editor Apps Script dentro il tuo Google Sheet |
| `ISTRUZIONI.md` | Solo per te, come guida |
