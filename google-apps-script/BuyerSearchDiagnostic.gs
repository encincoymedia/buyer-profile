/**
 * Diagnóstico manual de PRUEBA-001. No modifica Google Sheets.
 * Repite las cuatro consultas actuales: hasta 8 créditos de Tavily.
 * Los resultados pueden diferir de los de la ejecución anterior.
 */
function diagnosticarPrueba001() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    .getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encuentra la pestaña Buyer Profiles.");

  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift().map(String);
  const codeColumn = headers.indexOf("clientCode");
  if (codeColumn < 0) throw new Error("Falta la columna clientCode.");
  const matches = rows.filter(row => String(row[codeColumn]) === "PRUEBA-001");
  if (matches.length !== 1) {
    throw new Error("Debe existir una sola fila PRUEBA-001.");
  }
  const profile = Object.fromEntries(headers.map((name, i) => [name, matches[0][i]]));
  if (profile.searchStatus !== "no_matches") {
    throw new Error("Este diagnóstico requiere que PRUEBA-001 esté en no_matches.");
  }

  const criteria = BuyerSearch.makeCriteria(profile);
  const key = (PropertiesService.getScriptProperties()
    .getProperty("TAVILY_API_KEY") || "").trim();
  if (!key) throw new Error("Falta TAVILY_API_KEY en las propiedades del proyecto.");

  console.info("[Diagnóstico] Solo lectura; cuatro consultas, hasta 8 créditos.");
  console.info("[Diagnóstico] Consulta: " + criteria.query);
  const requests = BuyerSearch.portals.map(portal => ({
    url: "https://api.tavily.com/search",
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + key },
    muteHttpExceptions: true,
    followRedirects: false,
    payload: JSON.stringify({
      query: criteria.query,
      topic: "general",
      search_depth: "advanced",
      auto_parameters: false,
      max_results: 10,
      include_domains: [portal.path],
      include_domains_mode: "restrict",
      include_answer: false,
      include_raw_content: "text",
      include_images: false,
      include_usage: true
    })
  }));

  let responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch (_) {
    throw new Error("Fallo de conexión con Tavily. No se reintenta automáticamente.");
  }
  responses.forEach((response, i) => {
    const portal = BuyerSearch.portals[i];
    let data;
    try { data = JSON.parse(response.getContentText()); } catch (_) { data = null; }
    if (response.getResponseCode() !== 200 || !data || !Array.isArray(data.results)) {
      console.error("[Diagnóstico] " + portal.name + ": HTTP " + response.getResponseCode() + "; respuesta no utilizable.");
      return;
    }
    console.info("[Diagnóstico] " + JSON.stringify({
      portal: portal.name, filtro: portal.path, resultados: data.results.length,
      creditos: data.usage ? data.usage.credits : "no informados"
    }));
    data.results.forEach(item => {
      if (!item || !item.url) return;
      let reason;
      try {
        reason = BuyerSearch.evaluate(criteria, item, portal).reject || "Supera los filtros; pendiente de clasificación y duplicados";
      } catch (_) {
        reason = "Excepción al evaluar el anuncio";
      }
      console.info("[Diagnóstico] " + JSON.stringify({
        portal: portal.name,
        titulo: String(item.title || "").slice(0, 300),
        url: String(item.url),
        motivo: reason
      }));
    });
  });
  console.info("[Diagnóstico] Fin. No se ha modificado ninguna celda.");
}
