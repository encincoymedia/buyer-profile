/** Relectura de listados ya descubiertos: cero consultas y créditos Tavily. */
function comprobarPrueba002SinTavily() {
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
  const seeds = [
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/sant-cugat-del-valles-barcelona?ordenado-por=precios-desc",
      "title": "Casas y pisos en Sant Cugat del Vallès, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona/con-de-cuatro-cinco-habitaciones-o-mas",
      "title": "Casas y pisos de 4 habitaciones o más en Cerdanyola del ...",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona/con-jardin",
      "title": "Casas y pisos con jardín en Cerdanyola del Vallès, ...",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/sant-cugat-del-valles-barcelona?ordenado-por=precios-asc",
      "title": "Casas y pisos baratos en Sant Cugat del Vallès, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/ripollet-barcelona?ordenado-por=precios-asc",
      "title": "Casas y pisos baratos en Ripollet, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona?ordenado-por=precios-asc",
      "title": "Casas y pisos baratos en Cerdanyola del Vallès, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona/con-terraza",
      "title": "Casas y pisos con terraza en Cerdanyola del Vallès, ...",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona/con-chalets?ordenado-por=precios-asc",
      "title": "Casas y chalets baratos en Cerdanyola del Vallès, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "idealista.com",
    "item": {
      "url": "https://www.idealista.com/venta-viviendas/cerdanyola-del-valles-barcelona/con-chalets-independientes",
      "title": "Chalets independientes en Cerdanyola del Vallès, Barcelona",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/area/paseo-valldoreix-sant-cugat-del-valles/l",
      "title": "16 Casas y pisos en Paseo Valldoreix, Sant Cugat del Vallès | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/cerdanyola-del-valles/todas-las-zonas/obra-nueva/l",
      "title": "49 Casas y pisos de obra nueva en Cerdanyola del Vallès | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/area/avenida-cerdanyola-sant-cugat-del-valles/l",
      "title": "17 Casas y pisos en Avenida Cerdanyola, Sant Cugat del Vallès | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/cerdanyola-del-valles/canaletes-turonet/l",
      "title": "12 Casas y pisos en Canaletes - Turonet, Cerdanyola del Vallès",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/sant-cugat-del-valles/todas-las-zonas/2-habitaciones/l",
      "title": "43 Casas y pisos con 2 habitaciones en Sant Cugat del Vallès | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/sant-cugat-del-valles/todas-las-zonas/3-habitaciones/l",
      "title": "139 Casas y pisos con 3 habitaciones en Sant Cugat del Vallès | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/barcelona-capital/l-antiga-esquerra-de-l-eixample/l",
      "title": "451 Casas y pisos en L'Antiga Esquerra de l'Eixample, Barcelona | fotocasa",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "fotocasa.es",
    "item": {
      "url": "https://www.fotocasa.es/es/comprar/viviendas/sant-andreu-de-llavaneres/todas-las-zonas/amueblado/l",
      "title": "28 Casas y pisos amueblados en Sant Andreu de Llavaneres",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/pisos-valles_occidental/hasta-300000/m2-asc/2",
      "title": "Pisos en Vallès Occidental, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/pisos-sant_cugat_del_valles/preciorebajado",
      "title": "Pisos con precio rebajado en Sant Cugat del Vallès, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/casas-sant_cugat_del_valles/parking/hasta-120000/hab-desc",
      "title": "Casas y chalets con garaje en Sant Cugat del Vallès, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/pisos-cerdanyola_del_valles/con-4-habitaciones",
      "title": "Pisos con 4 o más habitaciones en Cerdanyola del Vallès, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/casas-valles_occidental",
      "title": "Casas y chalets en Vallès Occidental, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  },
  {
    "name": "pisos.com",
    "item": {
      "url": "https://www.pisos.com/venta/pisos-barbera_del_valles/piscina",
      "title": "Pisos con piscina en Barberà del Vallès, Barcelona - pisos.com",
      "raw_content": "",
      "content": ""
    }
  }
];
  const data = BuyerSearch.expandListings({ results: seeds.map(seed => ({ item: seed.item, portal: BuyerSearch.portals.find(portal => portal.name === seed.name) })), errors: [], coverage: ["Relectura de listados ya descubiertos; cero consultas Tavily adicionales"] }, criteria);
  const report = BuyerSearch.rank(criteria, data);
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
