/**
 * Second Brain — Google Apps Script API Proxy
 * Deploy as Web App: Execute as Me, Access: Anyone
 */

var API_KEY = 'sb-oney-2026';
var SHEET_ID = '1fyAdMu8RwcIOXBGyUhK3qqS8r-IOFVRFUokRLLaT41I';

function doGet(e) {
  if (e.parameter.key !== API_KEY) return jsonResponse({ error: 'Unauthorized' }, 401);

  const sheet = e.parameter.sheet;
  if (!sheet) return jsonResponse({ error: 'Missing sheet parameter' });

  // Special route: CalendarEvents returns today's Google Calendar events
  if (sheet === 'CalendarEvents') {
    try {
      var events = getCalendarEvents();
      return jsonResponse({ rows: events });
    } catch (err) {
      return jsonResponse({ error: err.message });
    }
  }

  // Special route: Bookkeeping reads from both company + family accounting sheets
  if (sheet === 'Bookkeeping') {
    try {
      var result = getBookkeeping();
      return jsonResponse({ rows: result });
    } catch (err) {
      return jsonResponse({ error: err.message });
    }
  }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ws = ss.getSheetByName(sheet);
    if (!ws) return jsonResponse({ error: 'Sheet not found: ' + sheet });

    const data = ws.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ headers: data[0] || [], rows: [] });

    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    return jsonResponse({ headers, rows });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.key !== API_KEY) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { action, sheet, data, id } = body;
  if (!sheet || !action) return jsonResponse({ error: 'Missing sheet or action' });

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const ws = ss.getSheetByName(sheet);
    if (!ws) return jsonResponse({ error: 'Sheet not found: ' + sheet });

    const headers = ws.getRange(1, 1, 1, ws.getLastColumn()).getValues()[0];

    if (action === 'append') {
      const row = headers.map(h => data[h] || '');
      ws.appendRow(row);
      return jsonResponse({ success: true, action: 'append' });
    }

    if (action === 'update' && id) {
      const allData = ws.getDataRange().getValues();
      const idCol = headers.indexOf('id');
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idCol]) === String(id)) {
          const row = headers.map(h => data[h] !== undefined ? data[h] : allData[i][headers.indexOf(h)]);
          ws.getRange(i + 1, 1, 1, row.length).setValues([row]);
          return jsonResponse({ success: true, action: 'update', row: i + 1 });
        }
      }
      return jsonResponse({ error: 'Row not found: ' + id });
    }

    if (action === 'delete' && id) {
      const allData = ws.getDataRange().getValues();
      const idCol = headers.indexOf('id');
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][idCol]) === String(id)) {
          ws.deleteRow(i + 1);
          return jsonResponse({ success: true, action: 'delete', row: i + 1 });
        }
      }
      return jsonResponse({ error: 'Row not found: ' + id });
    }

    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

/**
 * Get today's calendar events for the primary calendar
 * Called via GET: ?key=xxx&sheet=CalendarEvents
 */
function getCalendarEvents() {
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  var calendar = CalendarApp.getDefaultCalendar();
  var events = calendar.getEvents(start, end);
  
  var result = events.map(function(ev) {
    return {
      title: ev.getTitle(),
      start: ev.getStartTime().toISOString(),
      end: ev.getEndTime().toISOString(),
      allDay: ev.isAllDayEvent(),
      description: ev.getDescription() || '',
      location: ev.getLocation() || ''
    };
  });
  
  // Sort by start time
  result.sort(function(a, b) { return new Date(a.start) - new Date(b.start); });
  
  return result;
}

/**
 * Get bookkeeping data from company + family sheets
 */
function getBookkeeping() {
  var COMPANY_SHEET = '1Gv1sjrWnFW9K7f1dfe9uyWEvQbl0aTsifM3TXoALHXQ';
  var FAMILY_SHEET = '1F1k1OWYEbrNjmlqzskgK50J0y5yt02R-j6iqYNwrXQg';
  
  function readSheet(sheetId, account) {
    try {
      var ss = SpreadsheetApp.openById(sheetId);
      var ws = ss.getSheets()[0]; // first sheet
      var data = ws.getDataRange().getValues();
      if (data.length <= 1) return [];
      var headers = data[0];
      return data.slice(1).map(function(row) {
        var obj = { account: account };
        headers.forEach(function(h, i) { obj[h] = row[i]; });
        return obj;
      });
    } catch(e) { return []; }
  }
  
  var company = readSheet(COMPANY_SHEET, 'company');
  var family = readSheet(FAMILY_SHEET, 'family');
  var all = company.concat(family);
  
  // Sort by date descending
  all.sort(function(a, b) { return (b['日期']||'') > (a['日期']||'') ? 1 : -1; });
  
  // Normalize to English keys
  return all.map(function(r) {
    return {
      date: r['日期'] || '',
      type: r['类型'] === '收入' ? 'income' : 'expense',
      category: r['分类'] || '',
      description: r['描述'] || '',
      amount: Math.abs(parseFloat(r['金额']) || 0),
      gst: parseFloat(r['GST']) || 0,
      net: Math.abs(parseFloat(r['Net']) || 0),
      payment: r['付款方式'] || '',
      notes: r['备注'] || '',
      account: r.account
    };
  });
}

function jsonResponse(data, code) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
