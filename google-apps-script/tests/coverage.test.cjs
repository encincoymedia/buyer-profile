// Cobertura del buscador con servicios simulados; no escribe en Google.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '..', 'BuyerSearch.gs'), 'utf8');
const profile = {
  mainCity: 'Silla', market: 'Valencia', priorityZones: 'Silla',
  acceptableZones: 'Silla, Albal, Picassent', excludedZones: 'Valencia Capital',
  targetPrice: 250000, mortgageAmount: 250000, ownFunds: 30000,
  propertyTypes: 'Piso', minBedrooms: 2, minBathrooms: 2, minArea: 80,
  feature_Exterior: 'Obligatorio'
};
const calls = [];
let answer;
const context = vm.createContext({
  console: { info() {}, error() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'FAKE_TEST_KEY' }) },
  UrlFetchApp: { fetchAll(requests) {
    calls.push(requests);
    return requests.map(request => {
      const result = answer(request);
      return { getResponseCode: () => result.code, getContentText: () => result.body };
    });
  } }
});
vm.runInContext(source + '\nthis.engine = BuyerSearch;', context);
const engine = context.engine;
const portal = engine.portals[0];
const url = id => 'https://www.idealista.com/inmueble/' + id + '/';
const page = (id, city = 'Silla', price = '240.000', extra = '') =>
  '<html><head><link rel="canonical" href="' + url(id) + '"></head><body><h1>Piso en venta en ' + city + ', Valencia</h1><p>' + price + ' €</p><p>100 m² construidos. 3 habitaciones. 2 baños. Piso exterior luminoso.</p><p>' + extra + '</p></body></html>';
const listing = (ids, extra = '') => ({ item: {
  url: 'https://www.idealista.com/venta-viviendas/silla-valencia/',
  title: 'Pisos en venta en Silla', content: 'Precio del inmueble: 220.000 €. Piso exterior.',
  raw_content: ids.map(id => '[Piso en venta](' + url(id) + ')').join('\n') + extra
}, portal });
const input = results => ({ results, errors: [], coverage: [] });
const criteria = engine.makeCriteria(profile);
let passed = 0;
function test(name, check) {
  calls.length = 0;
  answer = request => ({ code: 200, body: page(/\/inmueble\/(\d+)/.exec(request.url)[1]) });
  check();
  passed++;
  console.log('OK ' + name);
}

test('consulta todas las zonas aceptadas sin cambiar presupuesto ni excluir la prioridad', () => {
  assert.equal(criteria.minPrice, 200000);
  assert.equal(criteria.maxPrice, 280000);
  for (const city of ['Silla', 'Albal', 'Picassent']) assert.ok(criteria.query.includes(city));
  assert.ok(!criteria.query.includes('Valencia Capital'));
});
test('cuatro consultas advanced a dominios completos y markdown con enlaces', () => {
  answer = () => ({ code: 200, body: JSON.stringify({ results: [], usage: { credits: 2 } }) });
  engine.retrieve(criteria);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 4);
  calls[0].forEach((request, i) => {
    const payload = JSON.parse(request.payload);
    assert.equal(payload.search_depth, 'advanced');
    assert.equal(payload.max_results, 20);
    assert.deepEqual(payload.include_domains, [engine.portals[i].name]);
    assert.equal(payload.include_domains_mode, 'restrict');
    assert.equal(payload.include_raw_content, 'markdown');
  });
});
test('recupera diez viviendas de listados y reutiliza la lectura en la verificación', () => {
  const ids = Array.from({ length: 12 }, (_, i) => 120000000 + i);
  const data = engine.expandListings(input([listing(ids)]));
  const report = engine.rank(criteria, data);
  assert.equal(report.matches.length, 10);
  assert.equal(report.status, 'needs_review');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 12);
  assert.equal(new Set(report.matches.map(match => match.url)).size, 10);
  report.matches.forEach(match => assert.equal(match.facts.price, 240000));
});
test('cada vivienda conserva solo sus propios datos; descarta precio, ocupación y otra localidad', () => {
  answer = request => {
    const id = /\/inmueble\/(\d+)/.exec(request.url)[1];
    return { code: 200, body: id === '120000001' ? page(id, 'Silla', '150.000') :
      id === '120000002' ? page(id, 'Silla', '240.000', 'Ocupada ilegalmente') :
      page(id, 'Paterna') };
  };
  const report = engine.rank(criteria, engine.expandListings(input([listing([120000001, 120000002, 120000003])])));
  assert.equal(report.matches.length, 0);
  assert.ok(report.summary.includes('por debajo del rango mínimo'));
  assert.ok(report.summary.includes('vivienda ocupada ilegalmente'));
  assert.ok(report.summary.includes('zona no acreditada'));
});
test('los enlaces de listados no heredan precios válidos si la ficha omite el precio', () => {
  answer = () => ({ code: 200, body: '<link href="' + url(120000001) + '"><h1>Piso en venta en Silla, Valencia</h1><p>Piso exterior de 100 m².</p>' });
  const report = engine.rank(criteria, engine.expandListings(input([listing([120000001])])));
  assert.equal(report.matches.length, 0);
  assert.ok(report.summary.includes('precio no comprobado'));
});
test('Silla queda antes de Albal aunque el precio en Albal sea mejor', () => {
  answer = request => {
    const id = /\/inmueble\/(\d+)/.exec(request.url)[1];
    return { code: 200, body: id === '120000001' ? page(id, 'Albal', '210.000') : page(id, 'Silla', '260.000') };
  };
  const report = engine.rank(criteria, engine.expandListings(input([listing([120000001, 120000002])])));
  assert.equal(report.matches.length, 2);
  assert.equal(report.matches[0].place, 'Silla');
  assert.equal(report.matches[1].place, 'Albal');
});
test('no sigue enlaces externos ni rutas que no sean anuncios individuales', () => {
  engine.expandListings(input([listing([120000001], '\n[Otro](https://example.com/private)\n[Más](https://www.idealista.com/venta-viviendas/madrid/)\n[Suplantado](https://www.idealista.com.evil.test/inmueble/120000002/)')]));
  assert.equal(calls[0].length, 1);
  assert.equal(calls[0][0].url, url(120000001));
  assert.equal(calls[0][0].followRedirects, false);
});
test('deduplica enlaces repetidos y no vuelve a leer un resultado directo', () => {
  const direct = { item: { url: url(120000001), title: 'Piso en venta en Silla', content: 'Precio del inmueble: 240.000 €' }, portal };
  const data = engine.expandListings(input([direct, listing([120000001, 120000002, 120000002]), listing([120000002])]));
  assert.equal(calls[0].length, 1);
  assert.equal(calls[0][0].url, url(120000002));
  assert.equal(data.results.length, 4);
});
test('limita la ampliación a sesenta fichas y reparte la muestra entre listados', () => {
  const first = Array.from({ length: 80 }, (_, i) => 120000000 + i);
  const second = Array.from({ length: 80 }, (_, i) => 130000000 + i);
  engine.expandListings(input([listing(first), listing(second)]));
  assert.equal(calls[0].length, 60);
  assert.equal(calls[0].filter(request => request.url.includes('/120')).length, 30);
  assert.equal(calls[0].filter(request => request.url.includes('/130')).length, 30);
});
test('un portal bloqueado queda señalado como parcial sin crear datos desde el listado', () => {
  answer = () => ({ code: 403, body: 'Access denied' });
  const report = engine.rank(criteria, engine.expandListings(input([listing([120000001])])));
  assert.equal(report.matches.length, 0);
  assert.equal(report.status, 'partial');
  assert.equal(calls.length, 1);
});
test('limpia enlaces y negritas de markdown antes de evaluar anuncios directos', () => {
  const data = engine.expandListings(input([{ item: { url: url(120000001),
    title: 'Piso en venta en Silla, Valencia',
    raw_content: '# [Piso en venta en Silla](https://www.idealista.com/inmueble/120000001/)\n**240.000 €**\n100 m² construidos. 3 habitaciones. 2 baños. Piso exterior luminoso.' }, portal }]));
  assert.equal(calls.length, 0);
  assert.equal(engine.evaluate(criteria, data.results[0].item, portal).facts.price, 240000);
});
test('recupera enlaces relativos del HTML cuando Tavily no incluye enlaces en el listado', () => {
  answer = request => request.url.includes('/venta-viviendas/')
    ? { code: 200, body: '<a href="/inmueble/120000001/">Ver piso</a><a href="https://example.com/inmueble/120000002/">Otro</a>' }
    : { code: 200, body: page('120000001') };
  const report = engine.rank(criteria, engine.expandListings(input([listing([])]), criteria));
  assert.equal(report.matches.length, 1);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].some(request => request.url === listing([]).item.url));
  assert.ok(calls[0].some(request => request.url.endsWith('/con-precio-hasta_280000,precio-desde_200000/')));
  assert.equal(calls[1][0].url, url(120000001));
});
test('no lee listados de alquiler ni de ciudades fuera del perfil', () => {
  const sale = listing([]);
  const outside = { ...sale, item: { ...sale.item, url: 'https://www.idealista.com/venta-viviendas/madrid-madrid/' } };
  const rental = { ...sale, item: { ...sale.item, url: 'https://www.idealista.com/alquiler-viviendas/silla-valencia/' } };
  engine.expandListings(input([outside, rental]), criteria);
  assert.equal(calls.length, 0);
});
test('el flujo completo guarda diez enlaces desde HTML sin alterar otra fila ni repetir Tavily', () => {
  const receiver = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
  const headers = vm.runInNewContext(/const HEADERS = (\[[\s\S]*?\]);/.exec(receiver)[1]);
  const storedProfile = { ...profile, clientCode: 'COVERAGE-001', timestamp: '"2026-10-07T08:00:00Z"', searchRequested: 'Sí', searchStatus: 'pending' };
  const other = headers.map(name => name === 'clientCode' ? 'OTRA-FILA' : '');
  const cells = [headers, other.slice(), headers.map(name => storedProfile[name] ?? '')];
  const original = cells[2].slice();
  const range = (row, col, count = 1, width = 1) => ({
    getValues: () => Array.from({ length: count }, (_, i) => Array.from({ length: width }, (_, j) => cells[row - 1 + i]?.[col - 1 + j] ?? '')),
    setValue(value) { cells[row - 1][col - 1] = value; return this; },
    setNote() { return this; },
    setRichTextValue(value) { return this.setValue(value.text); }
  });
  const sheet = { getLastRow: () => cells.length, getLastColumn: () => headers.length, getRange: range };
  const network = [];
  const runtime = vm.createContext({
    console: { info() {}, error() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'FAKE_TEST_KEY' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {},
      newRichTextValue: () => ({ text: '', setText(text) { this.text = text; return this; }, setLinkUrl() { return this; }, build() { return this; } }) },
    UrlFetchApp: { fetchAll(requests) {
      network.push(requests);
      assert.equal(cells[2][headers.indexOf('searchStatus')], 'searching');
      return requests.map((request, i) => {
        let body;
        if (request.url === 'https://api.tavily.com/search') {
          assert.equal(requests.length, 4);
          body = JSON.stringify({ results: i === 0 ? [listing([]).item] : [], usage: { credits: 2 } });
        } else if (request.url.includes('/venta-viviendas/')) {
          body = Array.from({ length: 12 }, (_, j) => '<a href="/inmueble/' + (120000000 + j) + '/">Ver piso</a>').join('');
        } else body = page(/\/inmueble\/(\d+)/.exec(request.url)[1]);
        return { getResponseCode: () => 200, getContentText: () => body };
      });
    } }
  });
  vm.runInContext(receiver + '\n' + source + '\nthis.engine = BuyerSearch;', runtime);
  const report = runtime.engine.runByCode('COVERAGE-001');
  assert.equal(report.status, 'needs_review');
  assert.equal(report.matches, 10);
  assert.deepEqual(network.map(requests => requests.length), [4, 2, 12]);
  assert.deepEqual(cells[1], other);
  headers.forEach((header, i) => { if (!/^match\d+$/.test(header) && !['searchStatus', 'searchedAt'].includes(header)) assert.equal(cells[2][i], original[i]); });
  assert.equal(runtime.engine.runByCode('COVERAGE-001').skipped, true);
  assert.equal(network.length, 3);
});
console.log(passed + ' pruebas de cobertura superadas; sin red ni cambios en Google Sheets.');
