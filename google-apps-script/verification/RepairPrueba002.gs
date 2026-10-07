/** Ejecución manual única; cuatro consultas advanced, hasta 8 créditos. */
function corregirPrueba002() {
  const expected = [
    "https://www.fotocasa.es/es/comprar/vivienda/ripollet/aire-acondicionado-calefaccion-terraza-amueblado/189098249/d",
    "https://www.fotocasa.es/es/comprar/vivienda/ripollet/aire-acondicionado-calefaccion-parking-terraza-ascensor-internet-no-amueblado/188596983/d",
    "https://www.fotocasa.es/es/comprar/vivienda/ripollet/aire-acondicionado-calefaccion-parking-jardin-terraza-patio-no-amueblado/190983214/d",
    "https://www.fotocasa.es/es/comprar/vivienda/ripollet/aire-acondicionado-calefaccion-parking-trastero-zona-comunitaria-ascensor-amueblado-internet/190750312/d"
  ];
  const fields = Array.from({ length: 10 }, (_, i) => "match" + (i + 1));
  const snapshot = () => {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const values = sheet.getRange(1, 1, sheet.getLastRow(), 70).getValues();
    const headers = values.shift().map(String);
    const entries = values.map((row, i) => ({ row: i + 2, profile: Object.fromEntries(headers.map((h, j) => [h, row[j]])) }))
      .filter(entry => entry.profile.clientCode === "Prueba-002");
    if (entries.length !== 1) throw new Error("Prueba-002 no es única.");
    return { sheet, headers, ...entries[0] };
  };
  const before = snapshot();
  if (before.profile.searchStatus !== "partial" || JSON.stringify(fields.map(field => before.profile[field]).filter(Boolean)) !== JSON.stringify(expected)) {
    throw new Error("La prueba cambió o ya fue corregida. No se repite la búsqueda.");
  }
  const identity = JSON.stringify(before.profile);
  const criteria = BuyerSearch.makeCriteria(before.profile);
  const report = BuyerSearch.rank(criteria, BuyerSearch.retrieve(criteria));
  console.info("[Verificación Prueba-002] " + JSON.stringify({ status: report.status, summary: report.summary,
    matches: report.matches.map(match => ({ url: match.url, title: match.title, place: match.place,
      price: match.facts.price, minimumIssues: match.minimumIssues, pending: match.pending })) }));
  if (report.matches.length !== 10 || !report.matches.some(match => match.zoneTier === 0)) {
    console.info("No se sustituye la fila: la comprobación aún no reúne diez candidatos con presencia de la zona prioritaria.");
    return;
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const current = snapshot();
    if (JSON.stringify(current.profile) !== identity) throw new Error("El perfil cambió. No se sobrescribe.");
    const cell = field => current.sheet.getRange(current.row, current.headers.indexOf(field) + 1);
    report.matches.forEach((match, i) => cell(fields[i]).setRichTextValue(
      SpreadsheetApp.newRichTextValue().setText(match.url).setLinkUrl(match.url).build()));
    cell("searchedAt").setValue(new Date());
    cell("searchStatus").setValue(report.status).setNote(report.summary.slice(0, 30000));
    SpreadsheetApp.flush();
    console.info("Prueba-002 corregida: diez enlaces guardados, con Sant Cugat primero.");
  } finally { lock.releaseLock(); }
}
