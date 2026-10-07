// Regresión del precio no leído y de la ocupación: sin red ni Google Sheets.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'BuyerSearch.gs'), 'utf8');
const logs = [];
let reply = null;
let verificationCalls = 0;
const context = vm.createContext({
  console: { info: message => logs.push(message), error: message => logs.push(message) },
  UrlFetchApp: { fetchAll(requests) {
    verificationCalls++;
    if (reply instanceof Error) throw reply;
    return requests.map(request => {
      const value = typeof reply === 'function' ? reply(request.url) : reply;
      return { getResponseCode: () => value.code, getContentText: () => value.body };
    });
  } }
});
vm.runInContext(source + '\nthis.engine = BuyerSearch;', context);
const engine = context.engine;
const profile = {
  mainCity: 'Silla', market: 'Valencia', targetPrice: 250000,
  mortgageAmount: 250000, ownFunds: 30000, maxPrice: 999999,
  priorityZones: 'Silla', acceptableZones: 'Albal', propertyTypes: 'Piso',
  minBedrooms: 2, minBathrooms: 2, minArea: 80,
  feature_Ascensor: 'Deseable', feature_Exterior: 'Importante'
};
const c = engine.makeCriteria(profile);
const portal = engine.portals[0];
const item = {
  title: 'Piso en venta en Silla, Valencia',
  url: 'https://www.idealista.com/inmueble/106356204/',
  content: 'Piso exterior. 89 m2 construidos. 3 habitaciones. 2 baños.',
  raw_content: null
};
const full = price => ({ ...item, content: 'Precio del inmueble: ' + price + ' €. ' + item.content });
const page = (price, extra = '', id = '106356204') => '<html><head><link rel="canonical" href="https://www.idealista.com/inmueble/' + id + '/"></head><body><h1>Piso en venta en Silla</h1><p>' + price + ' &euro;</p><p>' + extra + '</p><div>Precio del inmueble: <span>' + price + '</span> €</div></body></html>';
let passed = 0;
function test(name, fn) {
  logs.length = 0;
  verificationCalls = 0;
  reply = { code: 403, body: 'Access denied' };
  fn();
  passed++;
  console.log('OK ' + name);
}
function evaluate(value) { return engine.evaluate(c, value, portal); }
function rank(items) {
  return engine.rank(c, { results: items.map(item => ({ item, portal })), errors: [], coverage: ['portal simulado'] });
}

test('conserva el rango y las preferencias, y consulta también las zonas aceptables', () => {
  assert.equal(c.minPrice, 200000);
  assert.equal(c.maxPrice, 280000);
  assert.ok(c.query.includes('entre 200000 y 280000 euros'));
  assert.ok(c.query.includes('Albal'));
  assert.equal(c.features.find(f => f.name === 'Ascensor').priority, 'Deseable');
});
test('106356204 con precio leído de 71000 se descarta', () => {
  assert.equal(evaluate(full('71.000')).reject, 'por debajo del rango mínimo');
});
test('ocupación se descarta también con un precio dentro del rango', () => {
  assert.equal(evaluate({ ...full('220.000'), content: full('220.000').content + ' Ocupada ilegalmente.' }).reject, 'vivienda ocupada ilegalmente');
});
test('lee el precio posterior al módulo de hipoteca sin cambiar las preferencias', () => {
  const raw_content = '# Piso en venta en Silla\n' + item.content + '\nCalcula tu hipoteca\nCuota mensual estimada 500 €\n## Precio\nPrecio del inmueble: 71.000 €';
  assert.equal(evaluate({ ...item, raw_content }).reject, 'por debajo del rango mínimo');
});
test('detecta ocupación posterior al módulo de hipoteca', () => {
  const raw_content = '# Piso en venta en Silla\n' + full('220.000').content + '\nCalcula tu hipoteca\nCuota mensual estimada 500 €\n## Situación de la vivienda\nOcupada ilegalmente';
  assert.equal(evaluate({ ...full('220.000'), raw_content }).reject, 'vivienda ocupada ilegalmente');
});
test('no atribuye la ocupación de un anuncio relacionado a esta vivienda', () => {
  const raw_content = '# Piso en venta en Silla\n' + full('220.000').content + '\nAnuncios similares\nPiso ocupado ilegalmente. Precio del inmueble: 71.000 €';
  const result = evaluate({ ...full('220.000'), raw_content });
  assert.equal(result.reject, undefined);
  assert.equal(result.facts.price, 220000);
});
test('recupera un precio válido de la ficha cuando el buscador no lo aporta', () => {
  reply = { code: 200, body: page('220.000') };
  const result = rank([item]);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].facts.price, 220000);
  assert.equal(result.matches[0].priceTier, 0);
  assert.ok(!result.matches[0].pending.some(note => note.startsWith('Precio no visible')));
  assert.equal(verificationCalls, 1);
});
test('106356204 no pasa si la ficha revela 71000 aunque el buscador omita el precio', () => {
  reply = { code: 200, body: page('71.000') };
  const result = rank([item]);
  assert.equal(result.matches.length, 0);
  assert.ok(result.summary.includes('por debajo del rango mínimo'));
});
test('106356204 no pasa si la ficha revela ocupación aunque el buscador la omita', () => {
  reply = { code: 200, body: page('220.000', 'Ocupada ilegalmente') };
  const result = rank([item]);
  assert.equal(result.matches.length, 0);
  assert.ok(result.summary.includes('vivienda ocupada ilegalmente'));
});
test('la comprobación final detecta ocupación más allá de los primeros 12000 caracteres', () => {
  reply = { code: 200, body: page('220.000', 'x'.repeat(18000) + '<p>Ocupada ilegalmente</p>') };
  assert.equal(rank([item]).matches.length, 0);
});
test('la comprobación final usa el precio actual por encima del máximo', () => {
  reply = { code: 200, body: page('300.000') };
  assert.equal(rank([full('220.000')]).matches.length, 0);
});
test('la comprobación final usa el precio actual por debajo del mínimo', () => {
  reply = { code: 200, body: page('150.000') };
  assert.equal(rank([full('220.000')]).matches.length, 0);
});
test('incluye exactamente los límites de 200000 y 280000', () => {
  for (const amount of ['200.000', '280.000']) {
    reply = { code: 200, body: page(amount) };
    assert.equal(rank([item]).matches.length, 1);
  }
});
test('el precio desconocido queda fuera si el portal bloquea la comprobación', () => {
  assert.equal(rank([item]).matches.length, 0);
  assert.ok(logs.some(line => line.includes('precio no comprobado')));
});
test('comprueba la URL canónica de Idealista con barra final sin seguir redirecciones', () => {
  reply = url => url.endsWith('/') ? { code: 200, body: page('240.000') } : { code: 301, body: '' };
  const result = rank([{ ...item, url: item.url.slice(0, -1) }]);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].facts.price, 240000);
  assert.equal(verificationCalls, 1);
});
test('un fallo de conexión no permite guardar anuncios con precio desconocido', () => {
  reply = new Error('fallo simulado');
  assert.equal(rank([item]).matches.length, 0);
  assert.equal(rank([full('220.000')]).matches.length, 1);
});
test('111045307 con respuesta 404 se descarta aunque tenga un precio válido en el buscador', () => {
  reply = { code: 404, body: 'Page not found' };
  assert.equal(rank([{ ...full('220.000'), url: 'https://www.idealista.com/inmueble/111045307/' }]).matches.length, 0);
});
test('las cuotas hipotecarias no se usan para rellenar un precio desconocido', () => {
  reply = { code: 200, body: '<link href="https://www.idealista.com/inmueble/106356204/"><h1>Piso en venta en Silla</h1><p>Calcula tu hipoteca</p><p>Cuota mensual estimada</p><p>500 €</p>' };
  assert.equal(rank([item]).matches.length, 0);
});
test('no lee el precio ni la ocupación desde scripts, navegación o anuncios relacionados', () => {
  reply = { code: 200, body: '<link href="https://www.idealista.com/inmueble/106356204/"><nav>Ocupada ilegalmente</nav><script>Precio del inmueble: 71000 €; Ocupada ilegalmente</script><h1>Piso en venta en Silla</h1><p>220.000 €</p><div>Anuncios similares</div><p>Precio del inmueble: 71.000 €</p><p>Ocupada ilegalmente</p>' };
  assert.equal(rank([item]).matches.length, 1);
});
test('se conservan la deduplicación, el orden de preferencias y el máximo de diez resultados', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({
    ...full('220.000'), url: 'https://www.idealista.com/inmueble/' + (120000000 + i) + '/',
    content: full('220.000').content + (i === 11 ? ' Con ascensor.' : '')
  }));
  const result = rank([...items, items[0]]);
  assert.equal(result.matches.length, 10);
  assert.equal(result.matches[0].url, items[11].url);
  assert.equal(new Set(result.matches.map(match => match.url)).size, 10);
});
test('los filtros de mínimos y preferencias mantienen el comportamiento actual', () => {
  const result = evaluate({ ...full('220.000'), content: full('220.000').content.replace('2 baños', '1 baño') });
  assert.equal(result.reject, undefined);
  assert.equal(result.minimumIssues.length, 1);
});
test('el formulario guarda primero y escribe solo resultados válidos sin repetir consultas', () => {
  const webApp = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
  const headers = vm.runInNewContext(/const HEADERS = (\[[\s\S]*?\]);/.exec(webApp)[1]);
  const existing = headers.map(name => name === 'clientCode' ? 'OTRA-FILA' : '');
  const cells = [headers.slice(), existing.slice()];
  let fetchCalls = 0;
  const good = { ...item, url: 'https://www.idealista.com/inmueble/112641161/' };
  const range = (row, col, count = 1, width = 1) => ({
    getValues: () => Array.from({ length: count }, (_, i) => Array.from({ length: width }, (_, j) => cells[row - 1 + i]?.[col - 1 + j] ?? '')),
    setValue(value) { cells[row - 1][col - 1] = value; return this; },
    setNote() { return this; },
    setRichTextValue(value) { return this.setValue(value.text); }
  });
  const sheet = { getLastRow: () => cells.length, getLastColumn: () => headers.length, getRange: range, appendRow: row => cells.push(row.slice()) };
  const services = {
    console: { info() {}, error() {} },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }), flush() {},
      newRichTextValue: () => ({ text: '', setText(text) { this.text = text; return this; }, setLinkUrl() { return this; }, build() { return this; } })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'FAKE_TEST_KEY' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
    UrlFetchApp: { fetchAll(requests) {
      fetchCalls++;
      assert.equal(cells.length, 3);
      assert.equal(cells[2][headers.indexOf('searchStatus')], 'searching');
      return requests.map((request, i) => {
        if (request.url === 'https://api.tavily.com/search') {
          assert.equal(requests.length, 4);
          assert.equal(JSON.parse(request.payload).max_results, 20);
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ results: i === 0 ? [item, good] : [], usage: { credits: 2 } }) };
        }
        return { getResponseCode: () => 200, getContentText: () => request.url === item.url ? page('71.000', 'Ocupada ilegalmente') : page('240.000', '', '112641161') };
      });
    } }
  };
  const runtime = vm.createContext(services);
  vm.runInContext(webApp + '\n' + source + '\nthis.engine = BuyerSearch;', runtime);
  const payload = { ...profile, clientCode: 'FORM-CRITICAL', featurePriorities: { Exterior: 'Importante', Ascensor: 'Deseable' }, matchingFactors: [{ factor: 'Zona' }] };
  const response = JSON.parse(runtime.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
  assert.equal(response.success, true);
  assert.equal(response.searchStatus, 'needs_review');
  assert.equal(fetchCalls, 2); // Una tanda Tavily y la comprobación de enlaces ya existente.
  assert.deepEqual(cells[1], existing);
  assert.equal(cells[2][headers.indexOf('targetPrice')], 250000);
  assert.equal(cells[2][headers.indexOf('match1')], good.url);
  assert.equal(cells[2][headers.indexOf('match2')], '');
  assert.equal(runtime.engine.runByCode('FORM-CRITICAL').skipped, true);
  assert.equal(fetchCalls, 2);
});
console.log(passed + ' pruebas de regresión superadas; sin peticiones de red ni cambios en Google Sheets.');
