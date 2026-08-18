const SHEETS = {
  MASTER_PART: 'MASTER_PART',
  OUTBOUND: 'OUTBOUND',
  INBOUND: 'INBOUND',
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT',
}

const HEADERS = {
  MASTER_PART: ['id', 'partNumber', 'replacementPartNumber', 'description', 'location', 'warehouseType', 'minStock', 'maxStock', 'openingStock', 'openingStockDate', 'warehouseStock', 'active'],
  OUTBOUND: ['id', 'requestDate', 'requester', 'partNumber', 'qtyRequest', 'qtySupply', 'warehouseType', 'documents.pr', 'documents.po', 'documents.so', 'documents.dn', 'documents.invoice', 'notes', 'createdBy', 'createdAt'],
  INBOUND: ['id', 'receivedDate', 'partNumber', 'qtyMatdoc', 'qtyActual', 'grStatus', 'matdocNumber', 'spbNumber', 'poNumber', 'invoiceOrTo', 'source', 'notes', 'createdBy', 'createdAt'],
  STOCK_ADJUSTMENT: ['id', 'adjustmentDate', 'partNumber', 'previousBookStock', 'physicalCount', 'variance', 'reason', 'createdBy', 'createdAt'],
}

function setupDatabase() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  if (!spreadsheet) throw new Error('Jalankan setupDatabase dari Apps Script yang terikat ke Google Sheet.')
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId())
  ensureSheets_(spreadsheet)
}

function database_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('SPREADSHEET_ID belum dikonfigurasi. Jalankan setupDatabase().')
  return SpreadsheetApp.openById(id)
}

function validateSecret_(value) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET')
  if (!expected || value !== expected) throw new Error('Unauthorized request.')
}

function ensureSheets_(spreadsheet) {
  Object.keys(HEADERS).forEach((name) => {
    let sheet = spreadsheet.getSheetByName(name)
    if (!sheet) sheet = spreadsheet.insertSheet(name)
    if (sheet.getLastRow() === 0) {
      const headers = HEADERS[name]
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8F0FE')
      sheet.setFrozenRows(1)
      sheet.autoResizeColumns(1, headers.length)
    }
  })
}

function records_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet || sheet.getLastRow() < 2) return []
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  return values.slice(1).filter((row) => row.some((value) => value !== '')).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      if (String(header).includes('.')) {
        const parts = String(header).split('.')
        record[parts[0]] = record[parts[0]] || {}
        record[parts[0]][parts[1]] = row[index]
      } else {
        record[header] = row[index]
      }
    })
    return record
  })
}

function append_(spreadsheet, sheetName, data) {
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan.`)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const row = headers.map((header) => {
    if (String(header).includes('.')) {
      const parts = String(header).split('.')
      return data[parts[0]] && data[parts[0]][parts[1]] !== undefined ? data[parts[0]][parts[1]] : ''
    }
    return data[header] !== undefined ? data[header] : ''
  })
  sheet.appendRow(row)
}

function normalizeData_(spreadsheet) {
  return {
    parts: records_(spreadsheet, SHEETS.MASTER_PART).map((item) => ({
      ...item,
      minStock: Number(item.minStock || 0),
      maxStock: Number(item.maxStock || 0),
      openingStock: Number(item.openingStock || 0),
      warehouseStock: Number(item.warehouseStock || 0),
      active: String(item.active).toLowerCase() !== 'false',
    })),
    outbound: records_(spreadsheet, SHEETS.OUTBOUND).map((item) => ({ ...item, qtyRequest: Number(item.qtyRequest || 0), qtySupply: Number(item.qtySupply || 0) })),
    inbound: records_(spreadsheet, SHEETS.INBOUND).map((item) => ({ ...item, qtyMatdoc: Number(item.qtyMatdoc || 0), qtyActual: Number(item.qtyActual || 0) })),
    adjustments: records_(spreadsheet, SHEETS.STOCK_ADJUSTMENT).map((item) => ({ ...item, previousBookStock: Number(item.previousBookStock || 0), physicalCount: Number(item.physicalCount || 0), variance: Number(item.variance || 0) })),
  }
}

function response_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}

function doGet(event) {
  try {
    validateSecret_(event.parameter.secret)
    const spreadsheet = database_()
    ensureSheets_(spreadsheet)
    return response_({ data: normalizeData_(spreadsheet) })
  } catch (error) {
    return response_({ error: error.message })
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}')
    validateSecret_(body.secret)
    const spreadsheet = database_()
    ensureSheets_(spreadsheet)
    const record = { ...body.payload, id: Utilities.getUuid(), createdAt: new Date().toISOString() }
    const target = { OUTBOUND: SHEETS.OUTBOUND, INBOUND: SHEETS.INBOUND, ADJUSTMENT: SHEETS.STOCK_ADJUSTMENT }[body.action]
    if (!target) throw new Error('Action tidak dikenal.')
    const lock = LockService.getScriptLock()
    lock.waitLock(10000)
    try {
      append_(spreadsheet, target, record)
    } finally {
      lock.releaseLock()
    }
    return response_({ data: record })
  } catch (error) {
    return response_({ error: error.message })
  }
}
