/**
 * Comprobación única del 7 de octubre de 2026 con listados observados en
 * la ejecución anterior. No llama a Tavily. No instalar como activador.
 * Solo sustituye PRUEBA-001 cuando conserva los tres resultados esperados
 * y la ampliación consigue diez candidatos bajo los mismos criterios.
 */
function completarPrueba001SinTavily() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const rows = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = rows.shift().map(String);
  const codeIndex = headers.indexOf("clientCode");
  const found = rows.map((values, i) => ({ values, row: i + 2 })).filter(entry => entry.values[codeIndex] === "PRUEBA-001");
  if (found.length !== 1) throw new Error("Debe existir una sola fila PRUEBA-001.");
  const entry = found[0], before = JSON.stringify(entry.values);
  const profile = Object.fromEntries(headers.map((header, i) => [header, entry.values[i]]));
  const current = Array.from({ length: 10 }, (_, i) => profile["match" + (i + 1)]).filter(Boolean);
  const expected = [
    "https://www.fotocasa.es/es/comprar/vivienda/picassent/terraza-ascensor/190867503/d",
    "https://www.fotocasa.es/es/comprar/vivienda/albal/parking-ascensor/190974441/d",
    "https://www.fotocasa.es/es/comprar/vivienda/picassent/aire-acondicionado-ascensor-amueblado/190740983/d"
  ];
  if (profile.searchStatus !== "needs_review" || current.length !== 3 || !expected.every(url => current.includes(url))) {
    throw new Error("La fila ya no conserva el resultado esperado; no se modifica.");
  }
  const sources = [
    { portal: BuyerSearch.portals[0], url: "https://www.idealista.com/venta-viviendas/silla-valencia/con-pisos,exterior?ordenado-por=precios-desc" },
    { portal: BuyerSearch.portals[2], url: "https://www.pisos.com/venta/pisos-silla" },
    { portal: BuyerSearch.portals[0], url: "https://www.idealista.com/venta-viviendas/picassent-valencia/con-dos-banos" },
    { portal: BuyerSearch.portals[1], url: "https://www.fotocasa.es/es/comprar/pisos/picassent/todas-las-zonas/l", raw: current.map(url => "[Resultado anterior](" + url + ")").join("\n") }
  ];
  const criteria = BuyerSearch.makeCriteria(profile);
  const data = BuyerSearch.expandListings({
    results: sources.map(source => ({ portal: source.portal, item: { url: source.url, title: "Listado observado", raw_content: source.raw || "", content: "" } })),
    errors: [], coverage: ["Ampliación de la misma prueba con listados ya observados; cero consultas y créditos Tavily adicionales"]
  }, criteria);
  const report = BuyerSearch.rank(criteria, data);
  console.info("[Ampliación sin Tavily] " + JSON.stringify({ estado: report.status, resultados: report.matches.length,
    propiedades: report.matches.map(match => ({ url: match.url, precio: match.facts.price, zona: match.place })), resumen: report.summary }));
  if (report.matches.length !== 10) throw new Error("No se completaron diez candidatos; se conservan los tres resultados anteriores.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (JSON.stringify(sheet.getRange(entry.row, 1, 1, headers.length).getValues()[0]) !== before) {
      throw new Error("La fila cambió durante la lectura; no se modifica.");
    }
    report.matches.forEach((match, i) => sheet.getRange(entry.row, headers.indexOf("match" + (i + 1)) + 1)
      .setRichTextValue(SpreadsheetApp.newRichTextValue().setText(match.url).setLinkUrl(match.url).build()));
    sheet.getRange(entry.row, headers.indexOf("searchedAt") + 1).setValue(new Date());
    sheet.getRange(entry.row, headers.indexOf("searchStatus") + 1).setValue(report.status).setNote(report.summary.slice(0, 30000));
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  console.info("[Ampliación sin Tavily] Diez enlaces guardados solo en PRUEBA-001.");
}
