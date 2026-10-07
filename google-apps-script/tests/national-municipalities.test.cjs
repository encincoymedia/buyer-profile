const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let networkCalls = 0;
const context = vm.createContext({
  console: { info() {} },
  UrlFetchApp: { fetchAll() { networkCalls++; throw new Error('No debe consultar la red'); } }
});
vm.runInContext(fs.readFileSync(path.join(root, 'BuyerSearch.gs'), 'utf8') + '\nthis.engine = BuyerSearch;', context);
const engine = context.engine;
const base = { mainCity: 'Torrejón', market: 'Madrid', mortgageAmount: 450000, ownFunds: 50000, targetPrice: 350000 };
let passed = 0;
function test(name, check) { check(); passed++; console.log('OK ' + name); }
function item(portal, city, slug) {
  return {
    title: 'Piso en venta en ' + city + ', Madrid',
    raw_content: '400.000 €\n100 m² construidos. 3 habitaciones. 2 baños.',
    url: portal.name === 'idealista.com' ? 'https://www.idealista.com/inmueble/123456789/' :
      portal.name === 'fotocasa.es' ? 'https://www.fotocasa.es/es/comprar/vivienda/' + slug + '/terraza/123456789/d' :
      portal.name === 'pisos.com' ? 'https://www.pisos.com/comprar/piso-' + slug + '-123456789_100500/' :
      'https://www.milanuncios.com/venta-de-pisos-en-' + slug + '-madrid/piso-123456789.htm'
  };
}

test('todos los municipios del catálogo oficial se identifican en su provincia', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'municipalities-ine-2026.json')));
  assert.equal(Object.keys(catalog).length, 52);
  let count = 0;
  for (const [province, ...cities] of Object.values(catalog)) {
    for (const city of cities) {
      const result = engine.resolvePlace(city, province);
      assert.equal(result.status, 'resolved', city + ' / ' + province);
      count++;
    }
  }
  assert.equal(count, 8132);
});
test('Madrid + Torrejón se consulta como Torrejón de Ardoz sin cambiar el perfil', () => {
  for (const market of ['Madrid', 'Madrid capital', 'Provincia de Madrid', 'Comunidad de Madrid']) {
    const profile = { ...base, market };
    const before = JSON.stringify(profile);
    const criteria = engine.makeCriteria(profile);
    assert.ok(criteria.query.includes('Torrejón de Ardoz (Madrid)'));
    assert.equal(criteria.maxPrice, 500000);
    assert.equal(criteria.minPrice, 300000);
    assert.equal(JSON.stringify(profile), before);
  }
});
test('reconoce Torrejón de Ardoz en los cuatro portales', () => {
  const criteria = engine.makeCriteria(base);
  for (const portal of engine.portals) {
    const candidate = engine.evaluate(criteria, item(portal, 'Torrejón de Ardoz', 'torrejon-de-ardoz'), portal);
    assert.equal(candidate.reject, undefined, portal.name);
    assert.equal(candidate.place, 'Torrejón');
  }
});
test('los otros dos Torrejones no pasan por coincidencias del nombre corto en la URL', () => {
  const criteria = engine.makeCriteria(base);
  for (const portal of engine.portals) {
    for (const [city, slug] of [['Torrejón de Velasco', 'torrejon-de-velasco'], ['Torrejón de la Calzada', 'torrejon-de-la-calzada']]) {
      const listing = item(portal, city, slug);
      assert.ok(engine.evaluate(criteria, listing, portal).reject, portal.name + ': ' + city);
      assert.ok(engine.evaluate(criteria, { ...listing, url: listing.url.replace(/\/$/, '') }, portal).reject, portal.name + ': sin barra final');
    }
  }
  const portal = engine.portals[2];
  const data = engine.expandListings({ results: [{ portal, item: { url: 'https://www.pisos.com/venta/pisos-torrejon_de_velasco/', title: 'Pisos en venta' } }], errors: [], coverage: [] }, criteria);
  assert.equal(networkCalls, 0);
  assert.equal(data.results.length, 1);
});
test('el nombre completo de otro Torrejón conserva su identidad', () => {
  for (const city of ['Torrejón de Velasco', 'Torrejón de la Calzada']) {
    const criteria = engine.makeCriteria({ ...base, mainCity: city });
    assert.ok(criteria.query.includes(city));
    assert.ok(!criteria.query.includes('Torrejón de Ardoz'));
  }
});
test('las abreviaturas únicas funcionan en provincias diferentes', () => {
  for (const [input, province, full] of [
    ['Alcala', 'Madrid', 'Alcalá de Henares'],
    ['Santiago', 'A Coruña', 'Santiago de Compostela'],
    ['Chiclana', 'Cádiz', 'Chiclana de la Frontera'],
    ['San Sebastian', 'Madrid', 'San Sebastián de los Reyes'],
    ['Las Rozas', 'Madrid', 'Las Rozas de Madrid'],
    ['Hospitalet', 'Barcelona', "L'Hospitalet de Llobregat"]
  ]) {
    assert.equal(engine.resolvePlace(input, province).canonical, full);
    assert.ok(engine.makeCriteria({ ...base, mainCity: input, market: province }).query.includes(full));
  }
});
test('resuelve tildes, bilingüismo, artículos e identidades provinciales', () => {
  assert.equal(engine.resolvePlace('Alicante', 'Alacant').canonical, 'Alacant');
  assert.equal(engine.resolvePlace('Salvatierra', 'Álava').canonical, 'Agurain');
  assert.equal(engine.resolvePlace('Donostia', 'Guipúzcoa').canonical, 'Donostia');
  assert.equal(engine.resolvePlace('San Sebastián', 'Gipuzkoa').canonical, 'Donostia');
  assert.equal(engine.resolvePlace('San Sebastián', 'Madrid').canonical, 'San Sebastián de los Reyes');
  assert.equal(engine.resolvePlace('Las Rozas de Madrid', 'Madrid').canonical, 'Las Rozas de Madrid');
  assert.equal(engine.resolvePlace('Ceuta', 'Ceuta').status, 'resolved');
  assert.equal(engine.resolvePlace('Melilla', 'Melilla').status, 'resolved');
});
test('los nombres ambiguos se detienen antes de consultar Tavily, también en zonas y descartes', () => {
  const result = engine.resolvePlace('Pozuelo', 'Madrid');
  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(Array.from(result.candidates).sort(), ['Pozuelo de Alarcón', 'Pozuelo del Rey']);
  for (const field of ['mainCity', 'priorityZones', 'acceptableZones', 'excludedZones']) {
    assert.throws(() => engine.makeCriteria({ ...base, [field]: 'Pozuelo' }), /ambigua.*Pozuelo de Alarcón.*Pozuelo del Rey/);
  }
  assert.equal(networkCalls, 0);
});
test('conserva barrios y nombres no catalogados sin asignarlos a otra provincia', () => {
  assert.equal(engine.resolvePlace('Salamanca', 'Madrid').status, 'unresolved');
  assert.equal(engine.resolvePlace('Gràcia', 'Barcelona').status, 'unresolved');
  const criteria = engine.makeCriteria({ ...base, priorityZones: 'Salamanca' });
  assert.deepEqual(Array.from(criteria.places), ['Torrejón', 'Salamanca']);
  assert.ok(criteria.query.includes('Salamanca'));
  assert.equal(engine.resolvePlace('Torrejón', 'Cáceres').canonical, 'Torrejón el Rubio');
});
console.log(passed + ' comprobaciones nacionales superadas; sin red, créditos ni escrituras en Google Sheets.');
