// Pruebas locales sin peticiones a Tavily ni escrituras en Google Sheets.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'BuyerSearch.gs'), 'utf8');
const webApp = fs.readFileSync(path.join(root, 'Code.gs'), 'utf8');
const context = vm.createContext({ console: { info() {}, error() {} } });
vm.runInContext(source + '\nthis.search = BuyerSearch;', context);
const engine = context.search;
const profile = {
  clientCode: 'FIXTURE-001', market: 'Valencia', mainCity: 'Silla', maxPrice: 280000,
  targetPrice: 250000, priorityZones: 'Silla', acceptableZones: 'Silla, Albal, Picassent',
  excludedZones: 'Valencia Capital', propertyTypes: 'Piso', minBedrooms: 2,
  idealBedrooms: 3, minBathrooms: 2, minArea: 80, idealArea: 100,
  feature_Exterior: 'Obligatorio', 'feature_Buena luz natural': 'Obligatorio',
  'feature_Transporte público cercano': 'Obligatorio',
  'feature_Aire acondicionado': 'No lo quiere', 'feature_Calefacción': 'No lo quiere',
  'feature_Piscina': 'No lo quiere', 'feature_Zonas comunes': 'No lo quiere',
  acceptedStates: 'Buen estado', renovationLevel: 'Reforma ligera',
  disqualifiers: 'No visitable | Reforma integral | Interior',
  nearbyPoint: 'Cerca a colegios', idealHome: 'Muy luminosa y cercana a colegios',
  instantReject: 'Oscura y lejos de colegios', matchingFactor1: 'Precio',
  matchingFactor2: 'Zona', matchingFactor3: 'Luz natural',
  mortgageAmount: 250000, ownFunds: 30000,
  searchRequested: 'Sí', searchStatus: 'pending', timestamp: '"2026-10-05T09:00:00Z"'
};
const c = engine.makeCriteria(profile);
const base = {
  title: 'Piso en venta en Silla, Valencia',
  url: 'https://www.idealista.com/inmueble/12345678/',
  content: 'Precio del inmueble: 220.000 €. 100 m2 construidos. 3 habitaciones. 2 baños. Piso exterior muy luminoso. Cerca del tren y de colegios. Sin aire acondicionado. Sin calefacción. Sin piscina. Sin zonas comunes. Buen estado.',
  raw_content: null
};
const idealista = engine.portals[0];
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('OK ' + name); }
function evaluate(changes) { return engine.evaluate(c, { ...base, ...changes }, idealista); }

test('candidato dentro del presupuesto, con incertidumbres explícitas', () => {
  const result = evaluate({});
  assert.equal(result.reject, undefined);
  assert.equal(result.facts.price, 220000);
  assert.equal(result.facts.bathrooms, 2);
  assert.ok(result.pending.some(p => p.includes('colegios')));
  assert.ok(result.pending.some(p => p.includes('ficha completa')));
});
test('no filtra por la hipoteca ni expone el código del comprador en la consulta', () => {
  assert.ok(!c.query.includes('FIXTURE-001'));
  assert.ok(!c.query.includes('30000'));
  assert.ok(c.query.includes('280000'));
});
test('números españoles y decimales del formulario', () => {
  assert.equal(engine.number('280.000'), 280000);
  assert.equal(engine.number('280000.00'), 280000);
  assert.equal(engine.number('80,5'), 80.5);
  assert.equal(engine.number('6+'), 6);
});
test('máximo estricto', () => assert.equal(evaluate({ content: base.content.replace('220.000', '300.000') }).reject, 'supera el presupuesto'));
test('mínimo de baños', () => assert.ok(evaluate({ content: base.content.replace('2 baños', '1 baño') }).reject.includes('baños')));
test('no admite candidatos si faltan datos para comprobar los mínimos', () => assert.ok(evaluate({ content: base.content.replace('2 baños.', '') }).reject.includes('no se puede comprobar')));
test('un baño escrito con palabras incumple el mínimo de dos', () => assert.ok(evaluate({ content: base.content.replace('2 baños', 'un baño') }).reject.includes('mínimo de baños')));
test('No lo quiere excluye aire acondicionado presente', () => assert.ok(evaluate({ content: base.content.replace('Sin aire acondicionado', 'Con aire acondicionado') }).reject.includes('Aire acondicionado')));
test('obligatorio luz natural negativa', () => assert.ok(evaluate({ content: base.content.replace('muy luminoso', 'poco luminoso') }).reject.includes('Buena luz natural')));
test('reforma integral reciente no equivale a reforma pendiente', () => assert.equal(evaluate({ content: base.content + ' Reforma integral reciente.' }).reject, undefined));
test('reforma integral necesaria se descarta', () => assert.ok(evaluate({ content: base.content + ' Necesita reforma integral.' }).reject));
test('bloqueo CAPTCHA', () => assert.equal(evaluate({ title: 'Pardon Our Interruption', content: 'Para continuar, completa el captcha.' }).reject, 'bloqueo'));
test('URL individual que devuelve listado', () => assert.equal(evaluate({ title: 'Pisos en Silla - pisos.com', raw_content: '32 resultados\nGuardar búsqueda' }).reject, 'listado general'));
test('no confunde calle Silla con municipio Silla', () => assert.ok(evaluate({ title: 'Piso en venta en calle Silla, Paterna' }).reject));
test('localidad contradictoria en descripción', () => assert.equal(evaluate({ content: base.content + ' Vivienda en la localidad de Paterna, Valencia.' }).reject, 'ubicación contradictoria'));
test('no usa cuota hipotecaria como precio', () => {
  const result = evaluate({ content: 'Piso en Silla. Cuota mensual estimada 576 €. Capital + intereses 239.538 €.' });
  assert.ok(result.reject.includes('precio'));
});
test('reconoce precio explícito antes de importes financieros', () => {
  const facts = engine.facts({}, { text: 'Precio atractivo de €125.000 y una superficie de 87 m2. Capital + intereses 187.731 €.' });
  assert.equal(facts.price, 125000);
});
test('anuncio de alquiler excluido', () => assert.equal(evaluate({ title: 'Piso en alquiler en Silla' }).reject, 'otro tipo de oferta'));
test('misma URL con seguimiento solo una vez', () => {
  const data = { results: [{ item: base, portal: idealista }, { item: { ...base, url: base.url + '?utm=a' }, portal: idealista }], errors: [], coverage: [] };
  const result = engine.rank(c, data);
  assert.equal(result.matches.length, 1);
  assert.equal(result.status, 'needs_review');
});
test('fallo parcial no se presenta como búsqueda completa', () => {
  const result = engine.rank(c, { results: [{ item: base, portal: idealista }], errors: ['fotocasa.es: HTTP 429'], coverage: [] });
  assert.equal(result.status, 'partial');
});

// Integración simulada: filas, estados, guardado antes de fetch y reejecución.
let cells, notes = {}, calls = 0;
const headersMatch = /const HEADERS = (\[[\s\S]*?\]);/.exec(webApp);
const headers = vm.runInNewContext(headersMatch[1]);
function reset() { cells = [headers.slice(), headers.map(h => profile[h] ?? '')]; notes = {}; calls = 0; }
function range(row, col, nr = 1, nc = 1) {
  return {
    getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cells[row - 1 + i]?.[col - 1 + j] ?? '')); },
    setValue(v) { cells[row - 1][col - 1] = v; return this; },
    setValues(v) { v.forEach((r, i) => { cells[row - 1 + i] ||= []; r.forEach((x,j) => cells[row - 1 + i][col - 1 + j] = x); }); return this; },
    setNote(v) { notes[row + ':' + col] = v; return this; },
    setRichTextValue(v) { return this.setValue(v.text); }
  };
}
const sheet = { getLastRow: () => cells.length, getLastColumn: () => headers.length, getRange: range, appendRow: r => cells.push(r.slice()), setFrozenRows() {} };
const mocks = {
  console: { info() {}, error() {} },
  SpreadsheetApp: {
    openById: () => ({ getSheetByName: () => sheet }), flush() {},
    newRichTextValue: () => ({ text: '', setText(t) { this.text = t; return this; }, setLinkUrl() { return this; }, build() { return this; } })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'FAKE_TEST_KEY' }) },
  UrlFetchApp: { fetchAll(requests) {
    calls++;
    assert.equal(requests.length, 4);
    assert.ok(cells.some(r => r[headers.indexOf('searchStatus')] === 'searching'));
    return requests.map((r, i) => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ results: i === 0 ? [base] : [], usage: { credits: 2 } }) }));
  } },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) }
};
const integration = vm.createContext(mocks);
vm.runInContext(webApp + '\n' + source + '\nthis.engine = BuyerSearch;', integration);
reset();
test('procesa fila pending y escribe solo en sus resultados', () => {
  const initial = cells[1].slice();
  const result = integration.engine.runByCode('FIXTURE-001');
  assert.equal(result.status, 'needs_review');
  assert.equal(calls, 1);
  assert.equal(cells[1][headers.indexOf('match1')], base.url);
  headers.forEach((h, i) => { if (!['searchStatus', 'searchedAt', 'match1'].includes(h)) assert.equal(cells[1][i], initial[i]); });
});
test('no repite búsqueda ni consumo cuando ya no está pending', () => {
  assert.equal(integration.engine.runByCode('FIXTURE-001').skipped, true);
  assert.equal(calls, 1);
});
test('doPost guarda primero y después lanza búsqueda', () => {
  reset();
  const payload = { ...profile, clientCode: 'FORM-002', featurePriorities: { Exterior: 'Obligatorio' }, matchingFactors: [{ factor: 'Precio' }] };
  const response = JSON.parse(integration.doPost({ postData: { contents: JSON.stringify(payload) } }).text);
  assert.equal(response.success, true);
  assert.equal(cells.length, 3);
  assert.equal(cells[1][headers.indexOf('searchStatus')], 'pending');
  assert.equal(cells[2][headers.indexOf('searchStatus')], 'needs_review');
  assert.equal(calls, 1);
});
test('fallo de Tavily conserva el perfil y marca error', () => {
  reset();
  mocks.UrlFetchApp.fetchAll = () => { throw new Error('network test'); };
  const response = JSON.parse(integration.doPost({ postData: { contents: JSON.stringify({ ...profile, clientCode: 'FORM-FAIL' }) } }).text);
  assert.equal(response.success, true);
  assert.equal(cells.length, 3);
  assert.equal(cells[2][headers.indexOf('searchStatus')], 'error');
});
console.log(passed + ' pruebas superadas; 0 peticiones de red.');
