/**
 * Diagnóstico de cobertura: anuncios individuales en Silla (Valencia).
 * Hasta 4 consultas advanced, 8 créditos en total, sin reintentos.
 * Solo muestra resultados en el registro; no lee ni escribe perfiles.
 * Descarta también bloqueos y páginas generales con URL de anuncio.
 * El contenido restante no verifica municipio, precio ni disponibilidad.
 */
function testTavilyConnection() {
  const apiKey = (PropertiesService.getScriptProperties()
    .getProperty("TAVILY_API_KEY") || "").trim();
  if (!apiKey) throw new Error("Falta TAVILY_API_KEY en este proyecto.");

  const portals = [
    {
      name: "idealista.com",
      path: "idealista.com/inmueble",
      pattern: /^https:\/\/(?:www\.)?idealista\.com\/inmueble\/\d+\/?$/i
    },
    {
      name: "fotocasa.es",
      path: "fotocasa.es/es/comprar/vivienda",
      pattern: /^https:\/\/(?:www\.)?fotocasa\.es\/es\/comprar\/vivienda\/[^?#]+\/\d+\/d\/?$/i
    },
    {
      name: "pisos.com",
      path: "pisos.com/comprar",
      pattern: /^https:\/\/(?:www\.)?pisos\.com\/comprar\/[^/]+-\d+_\d+\/?$/i
    },
    {
      name: "milanuncios.com",
      path: "milanuncios.com/venta-de-pisos-en-silla-valencia",
      pattern: /^https:\/\/(?:www\.)?milanuncios\.com\/venta-de-pisos[^/]*\/[^/]+-\d+\.htm$/i
    }
  ];

  const report = [];
  const seen = new Set();
  console.info("[Tavily] COBERTURA: anuncios de pisos en Silla, Valencia.");

  for (const portal of portals) {
    console.info("[Tavily] Consultando " + portal.name);
    let response;
    try {
      response = UrlFetchApp.fetch("https://api.tavily.com/search", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + apiKey },
        payload: JSON.stringify({
          query: "Piso en venta en el municipio de Silla, Valencia. Precio y características.",
          topic: "general",
          search_depth: "advanced",
          auto_parameters: false,
          max_results: 8,
          include_domains: [portal.path],
          include_domains_mode: "restrict",
          include_answer: false,
          include_raw_content: "text",
          include_images: false,
          include_usage: true
        }),
        muteHttpExceptions: true,
        followRedirects: false
      });
    } catch (_) {
      throw new Error("No se pudo conectar con Tavily: " + portal.name);
    }

    const status = response.getResponseCode();
    if (status !== 200) {
      throw new Error("Tavily devolvió HTTP " + status + " para " +
        portal.name + ". Revisa la clave, los créditos y los límites.");
    }
    let data;
    try {
      data = JSON.parse(response.getContentText());
    } catch (_) {
      throw new Error("Respuesta inesperada de Tavily: " + portal.name);
    }
    if (!data || !Array.isArray(data.results)) {
      throw new Error("Falta la lista de resultados: " + portal.name);
    }

    const candidates = [];
    const discarded = [];
    for (const item of data.results) {
      if (!item || typeof item.url !== "string") continue;
      const url = item.url.trim().split(/[?#]/)[0];
      const title = String(item.title || "").trim();
      let reason = tavilyDiagnosticContentRejection_(item);
      if (!portal.pattern.test(url)) {
        reason = "No tiene un formato de URL de anuncio reconocido.";
      } else if (!reason && /\ben alquiler\b|^(local|nave|garaje|plaza de garaje|terreno|solar|trastero)\b.*\ben venta\b/i.test(title)) {
        reason = "El título indica alquiler o un inmueble distinto de vivienda.";
      } else if (!reason && seen.has(url.replace(/\/$/, "").replace("www.", ""))) {
        reason = "Enlace repetido.";
      }
      if (reason) {
        discarded.push({ url: url, motivo: reason });
        continue;
      }
      seen.add(url.replace(/\/$/, "").replace("www.", ""));
      const raw = String(item.raw_content || "").trim();
      const candidate = {
        titulo: title.slice(0, 180),
        url: url,
        fragmento: String(item.content || "").slice(0, 900),
        textoExtraidoDisponible: Boolean(raw),
        muestraTexto: tavilyDiagnosticExcerpt_(raw),
        evidencia: raw ? "Texto extraído; ficha pendiente de verificar." :
          "Solo fragmento del buscador; ficha no recuperada.",
        verificacion: "Pendiente: municipio, precio, características y disponibilidad."
      };
      candidates.push(candidate);
      console.info("[Tavily] CANDIDATO " + JSON.stringify(candidate));
    }
    const summary = {
      portal: portal.name,
      recibidos: data.results.length,
      candidatos: candidates.length,
      conTextoExtraido: candidates.filter(item => item.textoExtraidoDisponible).length,
      soloFragmento: candidates.filter(item => !item.textoExtraidoDisponible).length,
      descartados: discarded,
      uso: data.usage || null
    };
    report.push({ resumen: summary, candidatos: candidates });
    console.info("[Tavily] RESUMEN " + JSON.stringify(summary));
  }
  console.info("[Tavily] FIN. Los candidatos necesitan revisión; no se han guardado matches.");
  return report;
}

function tavilyDiagnosticContentRejection_(item) {
  const title = String(item.title || "").trim();
  const content = String(item.content || "");
  const raw = String(item.raw_content || "");
  // Inspecciona el contenido devuelto; una URL válida puede servir un CAPTCHA.
  const text = [title, content, raw.slice(0, 5000)].join("\n");
  if (/pardon our interruption|para continuar,?\s+completa el captcha|tu visita a milanuncios se ha interrumpido|access denied|verify (?:that )?you are human/i.test(text)) {
    return "El portal devolvió un bloqueo de acceso o CAPTCHA.";
  }
  // Conservador: estas señales indican que se recibió un listado o una ficha
  // ambigua. No afirma que el anuncio haya caducado ni intenta saltar bloqueos.
  const listingTitle = /^(?:\d+\s+)?(?:pisos(?: y apartamentos)?|apartamentos|casas(?: y pisos)?|viviendas)\s+(?:(?:baratos|en venta)\s+)?en\b/i.test(title);
  const listingBody = /\b\d[\d.,]*\s+resultados?\s*\n\s*Guardar b[uú]squeda/i.test(raw.slice(0, 8000));
  if (listingTitle || listingBody) {
    return "El contenido corresponde a una página general o no permite identificar una ficha individual.";
  }
  if (!content.trim() && !raw.trim()) {
    return "No hay texto del anuncio que se pueda revisar.";
  }
  return "";
}

function tavilyDiagnosticExcerpt_(raw) {
  // El registro anterior recortaba los primeros 900 caracteres, ocupados
  // por cookies. Muestra secciones de la ficha sin interpretar sus importes.
  const heading = /^(?:#{1,3}\s*)?(?:piso|apartamento|[aá]tico|d[uú]plex|casa|chalet|estudio)\b[^\n]*\ben venta\b[^\n]*/im.exec(raw);
  const details = /^(?:#{1,3}\s*)?(?:Comentario del anunciante|Descripci[oó]n|Caracter[ií]sticas(?: b[aá]sicas)?|Datos b[aá]sicos)\s*$/im.exec(raw);
  const sections = [];
  if (heading) sections.push(raw.slice(Math.max(0, heading.index - 160), heading.index + 740));
  if (details) sections.push(raw.slice(details.index, details.index + 900));
  if (!sections.length) return raw ? "No se identificó una sección de ficha en el texto extraído." : "";
  return sections.join("\n[…]\n");
}
