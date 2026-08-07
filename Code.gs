/**
 * IMPRESA SIMONI — Backend Google Apps Script
 * --------------------------------------------
 * Trasforma un Google Sheet in database per l'app "Impresa Simoni":
 * gestione giornate di lavoro, cantieri, operai, e note/foto/audio per
 * cantiere (salvate su Google Drive).
 *
 * Fogli gestiti automaticamente nello spreadsheet a cui è collegato:
 *   - Operai    : Nome
 *   - Cantieri  : Nome
 *   - Giornate  : EntryId | Data | Cantiere | Lavorazioni | Materiali | Operaio | Ore | AggiornatoIl
 *   - Note      : NoteId | Cantiere | Data | Testo | AggiornatoIl
 *   - Media     : MediaId | NoteId | Cantiere | Tipo | NomeFile | DriveFileId | DriveUrl | Data
 *
 * I file (foto/audio) vengono salvati in una cartella Drive dedicata,
 * con una sottocartella per ciascun cantiere.
 */

var ROOT_FOLDER_NAME = 'Impresa Simoni - Media';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var action = null;
    var payload = null;

    if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      action = body.action;
      payload = body.data;
    } else if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }

    var result;
    switch (action) {
      case 'getAll':
        result = getAll();
        break;
      case 'saveWorkers':
        saveWorkers(payload);
        result = { ok: true };
        break;
      case 'saveSites':
        saveSites(payload);
        result = { ok: true };
        break;
      case 'saveEntries':
        saveEntries(payload);
        result = { ok: true };
        break;
      case 'saveNotes':
        saveNotes(payload);
        result = { ok: true };
        break;
      case 'uploadMedia':
        result = uploadMedia(payload);
        break;
      case 'deleteMedia':
        deleteMedia(payload);
        result = { ok: true };
        break;
      default:
        result = { error: 'Azione sconosciuta: ' + action };
    }
    return jsonOutput(result);
  } catch (err) {
    return jsonOutput({ error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- helper fogli ---------- */
function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function sheetToObjects(sh) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var empty = row.every(function (c) { return c === '' || c === null; });
    if (empty) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    out.push(obj);
  }
  return out;
}

function clearDataRows(sh) {
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, Math.max(sh.getLastColumn(), 1)).clearContent();
}

function formatDateValue(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var y = v.getFullYear();
    var m = ('0' + (v.getMonth() + 1)).slice(-2);
    var d = ('0' + v.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return String(v || '');
}

/* ---------- lettura completa ---------- */
function getAll() {
  var workersSheet = getSheet('Operai', ['Nome']);
  var sitesSheet = getSheet('Cantieri', ['Nome']);
  var entriesSheet = getSheet('Giornate', ['EntryId', 'Data', 'Cantiere', 'Lavorazioni', 'Materiali', 'Operaio', 'Ore', 'AggiornatoIl']);
  var notesSheet = getSheet('Note', ['NoteId', 'Cantiere', 'Data', 'Testo', 'AggiornatoIl']);
  var mediaSheet = getSheet('Media', ['MediaId', 'NoteId', 'Cantiere', 'Tipo', 'NomeFile', 'DriveFileId', 'DriveUrl', 'Data']);

  var workers = sheetToObjects(workersSheet).map(function (r) { return String(r.Nome || ''); }).filter(String);
  var sites = sheetToObjects(sitesSheet).map(function (r) { return String(r.Nome || ''); }).filter(String);

  var entryRows = sheetToObjects(entriesSheet);
  var entriesMap = {};
  entryRows.forEach(function (r) {
    var id = String(r.EntryId || '');
    if (!id) return;
    if (!entriesMap[id]) {
      entriesMap[id] = {
        id: id,
        date: formatDateValue(r.Data),
        cantiere: String(r.Cantiere || ''),
        lavorazioni: String(r.Lavorazioni || ''),
        materiali: String(r.Materiali || ''),
        operai: [],
        updatedAt: String(r.AggiornatoIl || '')
      };
    }
    entriesMap[id].operai.push({
      nome: String(r.Operaio || ''),
      ore: Number(r.Ore) || 0
    });
  });
  var entries = Object.keys(entriesMap).map(function (k) { return entriesMap[k]; });

  var notes = sheetToObjects(notesSheet).map(function (r) {
    return {
      id: String(r.NoteId || ''),
      cantiere: String(r.Cantiere || ''),
      date: formatDateValue(r.Data),
      testo: String(r.Testo || ''),
      updatedAt: String(r.AggiornatoIl || '')
    };
  }).filter(function (n) { return n.id; });

  var media = sheetToObjects(mediaSheet).map(function (r) {
    return {
      id: String(r.MediaId || ''),
      noteId: String(r.NoteId || ''),
      cantiere: String(r.Cantiere || ''),
      tipo: String(r.Tipo || ''),
      nomeFile: String(r.NomeFile || ''),
      driveFileId: String(r.DriveFileId || ''),
      url: String(r.DriveUrl || ''),
      date: formatDateValue(r.Data)
    };
  }).filter(function (m) { return m.id; });

  return { workers: workers, sites: sites, entries: entries, notes: notes, media: media };
}

/* ---------- scrittura (sovrascrive interamente il foglio) ---------- */
function saveWorkers(list) {
  var sh = getSheet('Operai', ['Nome']);
  clearDataRows(sh);
  (list || []).forEach(function (w) { sh.appendRow([w]); });
}

function saveSites(list) {
  var sh = getSheet('Cantieri', ['Nome']);
  clearDataRows(sh);
  (list || []).forEach(function (s) { sh.appendRow([s]); });
}

function saveEntries(list) {
  var sh = getSheet('Giornate', ['EntryId', 'Data', 'Cantiere', 'Lavorazioni', 'Materiali', 'Operaio', 'Ore', 'AggiornatoIl']);
  clearDataRows(sh);
  var rows = [];
  (list || []).forEach(function (e) {
    (e.operai || []).forEach(function (o) {
      rows.push([e.id, e.date, e.cantiere, e.lavorazioni || '', e.materiali || '', o.nome, o.ore, e.updatedAt || '']);
    });
  });
  if (rows.length) {
    sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function saveNotes(list) {
  var sh = getSheet('Note', ['NoteId', 'Cantiere', 'Data', 'Testo', 'AggiornatoIl']);
  clearDataRows(sh);
  var rows = (list || []).map(function (n) {
    return [n.id, n.cantiere, n.date, n.testo || '', n.updatedAt || ''];
  });
  if (rows.length) {
    sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

/* ---------- Drive: cartelle e upload media ---------- */
function getOrCreateRootFolder() {
  var it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function getOrCreateSiteFolder(cantiereName) {
  var root = getOrCreateRootFolder();
  var safeName = String(cantiereName || 'Senza cantiere').trim() || 'Senza cantiere';
  var it = root.getFoldersByName(safeName);
  if (it.hasNext()) return it.next();
  return root.createFolder(safeName);
}

function uploadMedia(payload) {
  if (!payload || !payload.base64 || !payload.cantiere) {
    return { error: 'Dati mancanti per il caricamento del file.' };
  }
  var folder = getOrCreateSiteFolder(payload.cantiere);
  var mimeType = payload.mimeType || 'application/octet-stream';
  var fileName = payload.filename || ('file_' + new Date().getTime());
  var bytes = Utilities.base64Decode(payload.base64);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var mediaId = 'm_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
  var sh = getSheet('Media', ['MediaId', 'NoteId', 'Cantiere', 'Tipo', 'NomeFile', 'DriveFileId', 'DriveUrl', 'Data']);
  var now = new Date();
  var dateStr = formatDateValue(now);
  sh.appendRow([mediaId, payload.noteId || '', payload.cantiere, payload.tipo || 'foto', fileName, file.getId(), file.getUrl(), dateStr]);

  return {
    ok: true,
    media: {
      id: mediaId,
      noteId: payload.noteId || '',
      cantiere: payload.cantiere,
      tipo: payload.tipo || 'foto',
      nomeFile: fileName,
      driveFileId: file.getId(),
      url: file.getUrl(),
      date: dateStr
    }
  };
}

function deleteMedia(payload) {
  if (!payload || !payload.id) return;
  var sh = getSheet('Media', ['MediaId', 'NoteId', 'Cantiere', 'Tipo', 'NomeFile', 'DriveFileId', 'DriveUrl', 'Data']);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(payload.id)) {
      var fileId = String(values[i][5] || '');
      if (fileId) {
        try { DriveApp.getFileById(fileId).setTrashed(true); } catch (err) { /* file già rimosso */ }
      }
      sh.deleteRow(i + 1);
      break;
    }
  }
}
