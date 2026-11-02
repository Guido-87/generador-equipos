import test from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor } from './servidor.js';

test('HTTP sirve módulos públicos y rechaza archivos privados y escrituras', async t => {
  const servidor = crearServidor();
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  const origen = `http://127.0.0.1:${servidor.address().port}`;
  for (const [ruta, tipo] of [['/', 'text/html'], ['/script.js', 'text/javascript'], ['/styles.css', 'text/css'], ['/equipos.js', 'text/javascript'], ['/seleccion.js', 'text/javascript'], ['/jugadores.json', 'application/json']]) {
    const respuesta = await fetch(origen + ruta);
    assert.equal(respuesta.status, 200, ruta);
    assert.ok(respuesta.headers.get('content-type').startsWith(tipo));
    assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff');
    const contenido = await respuesta.text();
    assert.ok(contenido.length > 0);
    if (ruta === '/jugadores.json') assert.equal(JSON.parse(contenido)[0].id, 1);
  }
  for (const ruta of ['/.git/config', '/README.md', '/package.json', '/%2e%2e/package.json', '/inexistente']) {
    const respuesta = await fetch(origen + ruta);
    assert.equal(respuesta.status, 404, ruta);
    await respuesta.text();
  }
  const head = await fetch(origen, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await fetch(origen + '/jugadores.json', { method: 'POST', body: '[]' });
  assert.equal(post.status, 404);
  await post.text();
});
