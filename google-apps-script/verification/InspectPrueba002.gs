function inspeccionarFichas002SinTavily() {
  const urls = [
    'https://www.idealista.com/inmueble/109693096/',
    'https://www.pisos.com/comprar/piso-can_mates_volpelleres08195-67572279786_100600/',
    'https://www.idealista.com/venta-viviendas/sant-cugat-del-valles-barcelona/con-precio-hasta_500000,precio-desde_300000/'
  ];
  UrlFetchApp.fetchAll(urls.map(url => ({ url, muteHttpExceptions: true, followRedirects: false }))).forEach((response, i) => {
    const html = response.getContentText();
    const text = html.replace(/<(head|script|style|nav|footer)\b[^>]*>[^]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
    console.info('[Ficha observada] ' + JSON.stringify({ url: urls[i], http: response.getResponseCode(),
      declarations: [...text.toLowerCase().matchAll(/(?:municipio|localidad|poblacion|ciudad) de ([a-z ]{2,50})(?=[,.()])/g)].map(m=>m[0]),
      links: [...new Set((html.match(/\/inmueble\/\d+\//g)||[]))].length,
      locality: [...html.matchAll(/.{0,120}(?:addressLocality|addressRegion|itemprop="address|Sant Cugat).{0,180}/g)].slice(0,20).map(m=>m[0]),
      jsonld: [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^]*?)<\/script>/gi)].map(m=>m[1].slice(0,10000)) }));
  });
}
