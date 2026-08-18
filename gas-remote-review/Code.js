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

const INITIAL_DATA = {"parts":[{"id":"PART-001","partNumber":"204100343","replacementPartNumber":"","description":"SP Zunlong T500\\18\\CL-4\\SL 15W40\\GB11122-2006","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":74,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-002","partNumber":"1000400684","replacementPartNumber":"","description":"Filter Bahan Bakar Diesel ASSY\\PF-CO-01-01710","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":240,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-003","partNumber":"1000401258","replacementPartNumber":"","description":"Filter Pemisah Air-Bahan Bakar\\PR120BD-20L0.85","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":176,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-004","partNumber":"1010500455","replacementPartNumber":"","description":"Filter Udara Dalam\\A02-03680-2","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":135,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-005","partNumber":"1010500456","replacementPartNumber":"","description":"Filter Udara Luar\\A02-03670","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":121,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-006","partNumber":"1010601379","replacementPartNumber":"","description":"Filter Pilot\\П0-CO-02-02210(A)","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":120,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-007","partNumber":"1010601420","replacementPartNumber":"","description":"Filter Bahan Bakar\\ФР-CO-01-01480(1)","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":242,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-008","partNumber":"1010601499","replacementPartNumber":"","description":"Filter Oli\\PF-CO-01-03500\\0.4","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":242,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-009","partNumber":"1010601500","replacementPartNumber":"","description":"Filter Bahan Bakar\\ФР-CO-01-01700","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":242,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-010","partNumber":"1010601800","replacementPartNumber":"","description":"Filter Pengembalian Oli\\PF-CO-02-05032","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":150,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-011","partNumber":"1010601949","replacementPartNumber":"","description":"Filter Hisap\\ФE-080B3X","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":51,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-012","partNumber":"1130101687","replacementPartNumber":"","description":"Kompresor\\KD04A005Z\\Assembling","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":15,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-013","partNumber":"1220001741","replacementPartNumber":"","description":"Pin\\8E6358-PLUS","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":150,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-014","partNumber":"1220001776","replacementPartNumber":"","description":"Snap Ring\\8E6359-PLUS","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":150,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-015","partNumber":"1999907967","replacementPartNumber":"","description":"Gigi Bucket (Titik Bucket)\\1U3352TL","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":150,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-016","partNumber":"1010601426","replacementPartNumber":"","description":"Fuel filter element\\ NP0203010468","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":8,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-017","partNumber":"1010601384","replacementPartNumber":"","description":"Suction filter element\\PO-CO-01-03100","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":2,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-018","partNumber":"1000401047","replacementPartNumber":"","description":"Fuel Water Cold Treasure Filter Cartridg","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":8,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-019","partNumber":"1010601423","replacementPartNumber":"","description":"Crude fuel filter element\\NP0203020","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":8,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-020","partNumber":"1010601421","replacementPartNumber":"","description":"Air filter safety filter\\A02-03700","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":2,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-021","partNumber":"1010601951","replacementPartNumber":"","description":"Oil filter element\\module\\EF-089X\\1","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":2,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-022","partNumber":"1010500473","replacementPartNumber":"","description":"Empty filter element (outside)\\A02-","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-023","partNumber":"1010500474","replacementPartNumber":"","description":"Empty filter element (inside)\\A02-057","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":16,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-024","partNumber":"1010601406","replacementPartNumber":"","description":"Return oil filter element","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-025","partNumber":"1010601863","replacementPartNumber":"","description":"Oil return filter element\\assembly\\S","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-026","partNumber":"1010601599","replacementPartNumber":"","description":"Pilot filter element\\component\\SOMDX-","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-027","partNumber":"1019811081","replacementPartNumber":"","description":"Filter element\\pagx\\b040785\\","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":2,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-028","partNumber":"1010601284","replacementPartNumber":"","description":"Respirator filter element\\P040214","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":2,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-029","partNumber":"1010601382","replacementPartNumber":"","description":"Pilot filter element\\PO-CO-02-02730","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-030","partNumber":"1000301533","replacementPartNumber":"","description":"Oil filter element\\4989314\\","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":16,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-031","partNumber":"1010601422","replacementPartNumber":"","description":"Air filter outer filter\\A02-03690","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-032","partNumber":"1000400928","replacementPartNumber":"","description":"Diesel Filter\\275000-1105140\\0.3","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":4,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"},{"id":"PART-033","partNumber":"1009901453","replacementPartNumber":"","description":"Oil Filter\\186-1012240\\","location":"Jambi/Mendalo","warehouseType":"Consignment","minStock":1,"maxStock":1,"openingStock":16,"warehouseStock":0,"active":true,"openingStockDate":"2026-03-30"}],"outbound":[{"id":"OUT-2026-0001","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1000400928","qtyRequest":4,"qtySupply":4,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0002","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1009901453","qtyRequest":4,"qtySupply":4,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0003","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1019811081","qtyRequest":1,"qtySupply":1,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0004","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1010601406","qtyRequest":1,"qtySupply":1,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0005","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1010601422","qtyRequest":2,"qtySupply":2,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0006","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1010601421","qtyRequest":2,"qtySupply":2,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0007","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1010601384","qtyRequest":1,"qtySupply":1,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0008","requestDate":"2026-03-30","requester":"Anto Ramli","partNumber":"1010601382","qtyRequest":2,"qtySupply":2,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-30T08:00:00.000Z"},{"id":"OUT-2026-0009","requestDate":"2026-03-31","requester":"Ariq","partNumber":"204100343","qtyRequest":8,"qtySupply":8,"warehouseType":"Consignment","documents":{"pr":"","po":"","so":"","dn":"","invoice":""},"notes":"","createdBy":"Warehouse Man","createdAt":"2026-03-31T08:00:00.000Z"}]}

function setupDatabase() {
  const spreadsheet = init_()
  const seeded = seedInitialData_(spreadsheet)
  const properties = PropertiesService.getScriptProperties()
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    apiSecret: properties.getProperty('API_SECRET'),
    sheets: Object.keys(HEADERS),
    seeded,
  }
}
function init_() {
  const props = PropertiesService.getScriptProperties()
  let id = props.getProperty('SPREADSHEET_ID')
  let spreadsheet
  
  if (!id) {
    // Try bound spreadsheet
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    } catch(e) {}
    
    if (spreadsheet) {
      id = spreadsheet.getId()
      props.setProperty('SPREADSHEET_ID', id)
    } else {
      // Create new standalone spreadsheet
      spreadsheet = SpreadsheetApp.create('SOH Command Center DB')
      id = spreadsheet.getId()
      props.setProperty('SPREADSHEET_ID', id)
      
      const defaultSheet = spreadsheet.getSheets()[0]
      if (defaultSheet && defaultSheet.getName() !== 'MASTER_PART') {
        defaultSheet.setName('TEMP_DELETE')
      }
    }
  } else {
    spreadsheet = SpreadsheetApp.openById(id)
  }
  
  ensureSheets_(spreadsheet)
  
  const tempSheet = spreadsheet.getSheetByName('TEMP_DELETE')
  if (tempSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(tempSheet)
  }
  
  if (!props.getProperty('API_SECRET')) {
    props.setProperty('API_SECRET', Utilities.getUuid())
  }
  
  return spreadsheet
}

function writeRows_(spreadsheet, sheetName, items) {
  const sheet = spreadsheet.getSheetByName(sheetName)
  if (!sheet || !items.length) return 0
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  const rows = items.map((item) => headers.map((header) => {
    if (String(header).includes('.')) {
      const parts = String(header).split('.')
      return item[parts[0]] && item[parts[0]][parts[1]] !== undefined ? item[parts[0]][parts[1]] : ''
    }
    return item[header] !== undefined ? item[header] : ''
  }))
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows)
  return rows.length
}

function seedInitialData_(spreadsheet) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const inserted = { parts: 0, outbound: 0 }
    if (!records_(spreadsheet, SHEETS.MASTER_PART).length) inserted.parts = writeRows_(spreadsheet, SHEETS.MASTER_PART, INITIAL_DATA.parts)
    if (!records_(spreadsheet, SHEETS.OUTBOUND).length) inserted.outbound = writeRows_(spreadsheet, SHEETS.OUTBOUND, INITIAL_DATA.outbound)
    return inserted
  } finally {
    lock.releaseLock()
  }
}

function seedDatabase() {
  const spreadsheet = init_()
  return { spreadsheetId: spreadsheet.getId(), spreadsheetUrl: spreadsheet.getUrl(), seeded: seedInitialData_(spreadsheet) }
}

function database_() {
  return init_()
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
    const isPing = event.parameter && event.parameter.ping
    if (isPing) return response_({ status: 'ok' })
    validateSecret_(event.parameter.secret)
    const spreadsheet = database_()
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

