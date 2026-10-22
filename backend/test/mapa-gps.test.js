const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.resolve(__dirname, '../../frontend');
const html = fs.readFileSync(path.join(frontend, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(frontend, 'script.js'), 'utf8');

test('frontend JavaScript has valid syntax', () => {
  assert.doesNotThrow(() => new Function(script));
});

test('map selector offers three distinct map types', () => {
  for (const value of ['satelite', 'padrao', 'relevo']) {
    assert.match(html, new RegExp('<option value="' + value + '">'));
  }
  assert.match(script, /const mapasBase = \{ satelite: esri, padrao: osm, relevo \}/);
});

test('GPS controls exist and automatic positioning is enabled', () => {
  assert.match(html, /id="btnMinhaLocalizacao"/);
  assert.match(html, /id="gpsStatus"/);
  assert.match(script, /navigator\.geolocation\.watchPosition/);
  assert.match(script, /solicitarLocalizacao\(\);/);
  assert.match(script, /map\.setView\(\[lat, lng\], 16\)/);
});

test('frontend map controls reference existing elements', () => {
  for (const id of ['tipoMapa', 'btnMinhaLocalizacao', 'gpsStatus']) {
    assert.ok(html.includes('id="' + id + '"'));
    assert.ok(script.includes("getElementById('" + id + "')"));
  }
});

test('distinct icons exist for nautical categories and reported hazards', () => {
  for (const category of ['boia', 'boiaLateral', 'boiaEspecial', 'boiaProblema', 'perigo', 'anomalia', 'verificado']) {
    assert.match(script, new RegExp(category + ':'));
  }
  assert.match(script, /iconSinal\(categoriaBoia\(b\)\)/);
  assert.match(script, /iconSinal\(categoriaRelato\(r\.tipo\)\)/);
  assert.match(html, /id="legendaSinais"/);
});

test('historical buoy layer is optional and distinct from verified signals', () => {
  assert.match(html, /id="btnBoiasHistoricas"/);
  assert.match(script, /L\.layerGroup\(\)/);
  assert.match(script, /boias-historicas\.json/);
  assert.match(script, /não verificado para navegação atual/);
  const catalogo = JSON.parse(fs.readFileSync(path.join(frontend, 'data/boias-historicas.json'), 'utf8'));
  assert.equal(catalogo.registros.length, 3);
  for (const registro of catalogo.registros) {
    assert.equal(registro.situacao, 'historico_nao_verificado');
    assert.ok(registro.lat < 0 && registro.lng < 0);
  }
});
