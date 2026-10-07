const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const calls = [];
let answer = () => ({ code: 200, body: '' });
const context = vm.createContext({
  console: { info() {} },
  UrlFetchApp: { fetchAll(requests) {
    calls.push(...requests);
    return requests.map(request => {
      const result = answer(request);
      return { getResponseCode: () => result.code, getContentText: () => result.body };
    });
  } }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'BuyerSearch.gs'), 'utf8') + '\nthis.engine = BuyerSearch;', context);
const engine = context.engine;
const profile = {
  mainCity: 'Sant Cugat', priorityZones: 'Sant Cugat', market: 'Barcelona',
  acceptableZones: 'Ripollet, Cerdanyola', excludedZones: 'Barcelona',
  targetPrice: 350000, mortgageAmount: 450000, ownFunds: 50000,
  propertyTypes: 'Indiferente'
};
const criteria = engine.makeCriteria(profile);
const raw = city => 'Piso en venta en ' + city + ', Barcelona\n400.000 €\n100 m² construidos. 3 habitaciones. 2 baños. Piso exterior luminoso con balcón.\nMunicipio de ' + city + '.';
const listing = (portal, city, slug, id = 123456789) => ({
  title: 'Piso en venta en ' + city + ', Barcelona', raw_content: raw(city),
  url: portal.name === 'idealista.com' ? 'https://www.idealista.com/inmueble/' + id + '/' :
    portal.name === 'fotocasa.es' ? 'https://www.fotocasa.es/es/comprar/vivienda/' + slug + '/terraza/' + id + '/d' :
    portal.name === 'pisos.com' ? 'https://www.pisos.com/comprar/piso-' + slug + '-' + id + '_100500/' :
    'https://www.milanuncios.com/venta-de-pisos-en-' + slug + '-barcelona/piso-' + id + '.htm'
});
let passed = 0;
function test(name, check) { calls.length = 0; check(); passed++; console.log('OK ' + name); }
test('el perfil conserva zonas, presupuesto y consulta con nombres completos', () => {
  assert.equal(criteria.minPrice, 300000);
  assert.equal(criteria.maxPrice, 500000);
  assert.deepEqual(Array.from(criteria.places), ['Sant Cugat', 'Ripollet', 'Cerdanyola']);
  assert.ok(criteria.query.includes('Sant Cugat del Vallès'));
  assert.ok(criteria.query.includes('Cerdanyola del Vallès'));
});
test('reconoce nombres completos en los cuatro portales sin modificar el perfil', () => {
  for (const portal of engine.portals) {
    for (const [city, slug, expected] of [
      ['Sant Cugat del Vallès', 'sant-cugat-del-valles', 'Sant Cugat'],
      ['Cerdanyola del Vallés', 'cerdanyola-del-valles', 'Cerdanyola']
    ]) {
      const candidate = engine.evaluate(criteria, listing(portal, city, slug), portal);
      assert.equal(candidate.reject, undefined, portal.name + ': ' + candidate.reject);
      assert.equal(candidate.place, expected);
      assert.equal(candidate.facts.price, 400000);
    }
  }
});
test('acepta nombres cortos cuando el comprador escribió el nombre completo', () => {
  const full = engine.makeCriteria({ ...profile, mainCity: 'Sant Cugat del Vallès', priorityZones: 'Sant Cugat del Vallès' });
  const candidate = engine.evaluate(full, listing(engine.portals[0], 'Sant Cugat', 'sant-cugat'), engine.portals[0]);
  assert.equal(candidate.place, 'Sant Cugat del Vallès');
  assert.equal(candidate.zoneTier, 0);
});
test('rechaza Sant Cugat Sesgarrigues y calles con nombre de otro municipio', () => {
  for (const portal of engine.portals) {
    assert.ok(engine.evaluate(criteria, listing(portal, 'Sant Cugat Sesgarrigues', 'sant-cugat-sesgarrigues'), portal).reject);
  }
  const item = listing(engine.portals[0], 'Barcelona', 'barcelona');
  item.title = 'Piso en venta en Calle de Sant Cugat, Barcelona';
  assert.equal(engine.evaluate(criteria, item, engine.portals[0]).reject, 'zona no acreditada en título o URL');
});
test('la equivalencia exige Barcelona y conserva exclusiones y contradicciones', () => {
  const item = listing(engine.portals[1], 'Sant Cugat del Vallès', 'sant-cugat-del-valles');
  assert.ok(engine.evaluate(engine.makeCriteria({ ...profile, market: 'Valencia' }), item, engine.portals[1]).reject);
  assert.equal(engine.evaluate(engine.makeCriteria({ ...profile, excludedZones: 'Sant Cugat del Vallès' }), item, engine.portals[1]).reject, 'zona descartada');
  item.raw_content = raw('Sant Cugat del Vallès') + '\nLocalidad de Rubí.';
  assert.equal(engine.evaluate(criteria, item, engine.portals[1]).reject, 'ubicación contradictoria');
});
test('lee listados de nombres completos y guiones bajos; no lee el municipio de prefijo similar', () => {
  answer = () => ({ code: 200, body: '' });
  const entries = [
    [0, 'https://www.idealista.com/venta-viviendas/sant-cugat-del-valles-barcelona/'],
    [1, 'https://www.fotocasa.es/es/comprar/viviendas/cerdanyola-del-valles/todas-las-zonas/l'],
    [2, 'https://www.pisos.com/venta/pisos-sant_cugat_del_valles/'],
    [0, 'https://www.idealista.com/venta-viviendas/sant-cugat-sesgarrigues-barcelona/']
  ].map(([i, url]) => ({ portal: engine.portals[i], item: { url, title: 'Casas y pisos en venta', raw_content: '' } }));
  engine.expandListings({ results: entries, errors: [], coverage: [] }, criteria);
  assert.equal(calls.length, 4);
  assert.ok(!calls.some(request => request.url.includes('sesgarrigues')));
});
test('mantiene Sant Cugat por delante de las zonas aceptables después de verificar', () => {
  const items = [
    listing(engine.portals[1], 'Ripollet', 'ripollet', 123456789),
    listing(engine.portals[1], 'Cerdanyola del Vallès', 'cerdanyola-del-valles', 123456790),
    listing(engine.portals[1], 'Sant Cugat del Vallès', 'sant-cugat-del-valles', 123456791)
  ];
  answer = request => ({ code: 200, body: '<h1>' + items.find(item => item.url === request.url).title + '</h1><p>' + items.find(item => item.url === request.url).raw_content + '</p>' });
  const report = engine.rank(criteria, { results: items.map(item => ({ item, portal: engine.portals[1] })), errors: [], coverage: [] });
  assert.equal(report.matches.length, 3);
  assert.equal(report.matches[0].place, 'Sant Cugat');
  assert.equal(report.matches[0].zoneTier, 0);
});
test('lee el título completo de la ficha y normaliza la barra antes de los parámetros', () => {
  const detail = 'https://www.idealista.com/inmueble/123456789/';
  answer = request => request.url.includes('/venta-viviendas/')
    ? { code: 200, body: '<a href="/inmueble/123456789/">Ver piso</a>' }
    : { code: 200, body: '<html><head><title>Piso en venta en Calle Major, Monestir, Sant Cugat del Vallès — idealista</title><link href="' + detail + '"></head><body><h1>Piso en venta en Calle Major</h1><p>400.000 €</p><p>100 m² construidos. 3 habitaciones. 2 baños. Piso exterior luminoso con balcón.</p></body></html>' };
  const listUrl = 'https://www.idealista.com/venta-viviendas/sant-cugat-del-valles-barcelona?ordenado-por=precios-asc';
  const data = engine.expandListings({ results: [{ portal: engine.portals[0], item: { url: listUrl, title: 'Casas y pisos en Sant Cugat del Vallès' } }], errors: [], coverage: [] }, criteria);
  const report = engine.rank(criteria, data);
  assert.ok(calls.some(request => request.url === listUrl.replace('?', '/?')));
  assert.ok(calls.some(request => request.url.endsWith('/con-precio-hasta_500000,precio-desde_300000/')));
  assert.equal(report.matches.length, 1);
  assert.equal(report.matches[0].place, 'Sant Cugat');
  assert.equal(report.matches[0].facts.price, 400000);
});
test('en Pisos.com el título acredita municipio aunque la URL contenga solo el barrio', () => {
  const item = listing(engine.portals[2], 'Sant Cugat del Vallès', 'parc_central08173');
  item.title = 'Piso en venta en Parc Central (Sant Cugat del Vallès) por 400.000 €';
  const candidate = engine.evaluate(criteria, item, engine.portals[2]);
  assert.equal(candidate.reject, undefined);
  assert.equal(candidate.place, 'Sant Cugat');
});
test('lee el municipio del encabezado propio sin usar anuncios relacionados', () => {
  const portal = engine.portals[2];
  const detail = 'https://www.pisos.com/comprar/piso-parc_central08173-123456789_100500/';
  answer = () => ({ code: 200, body: '<head><title>Piso en venta en Parc Central por 400.000 €</title></head><h1>Piso en venta en Parc Central</h1><p>Parc Central (Sant Cugat del Vall&egrave;s)</p><p>100 m² construidos. 3 habitaciones. 2 baños. Piso luminoso.</p><h2>Viviendas cerca de Madrid</h2><p>Municipio de Madrid. 180.000 €.</p>' });
  const data = engine.expandListings({ results: [{ portal, item: { url: 'https://www.pisos.com/venta/pisos-sant_cugat_del_valles/', raw_content: '[' + detail + '](' + detail + ')' } }], errors: [], coverage: [] }, criteria);
  const report = engine.rank(criteria, data);
  assert.equal(report.matches.length, 1);
  assert.equal(report.matches[0].place, 'Sant Cugat');
  assert.equal(report.matches[0].facts.price, 400000);
});
test('una descripción de la comarca no contradice el municipio acreditado', () => {
  const item = listing(engine.portals[0], 'Sant Cugat del Vallès', 'sant-cugat-del-valles');
  item.raw_content += '\nSant Cugat del Vallès es un municipio de la comarca del Vallès Occidental, perteneciente a Barcelona.';
  assert.equal(engine.evaluate(criteria, item, engine.portals[0]).reject, undefined);
});
console.log(passed + ' comprobaciones de municipios superadas.');
