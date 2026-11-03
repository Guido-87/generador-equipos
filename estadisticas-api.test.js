import test from 'node:test';
import assert from 'node:assert/strict';
import { crearApiEstadisticas } from './estadisticas-api.js';

const jugadores = [{ id: 1, nombre: 'Uno' }, { id: 2, nombre: 'Dos' }];
const fechaAbierta = '2026-11-02T12:00:00-03:00';
const dato = { jugadorId: 1, goles: 2, asistencias: 3, mvp: true };

function almacen() {
  const datos = new Map();
  return {
    datos,
    async get(key) { return datos.has(key) ? structuredClone(datos.get(key)) : null; },
    async list({ prefix }) { return { blobs: [...datos.keys()].filter(key => key.startsWith(prefix)).map(key => ({ key })) }; },
    async setJSON(key, valor, { onlyIfNew } = {}) {
      if (onlyIfNew && datos.has(key)) return { modified: false };
      datos.set(key, structuredClone(valor));
      return { modified: true, etag: 'test' };
    }
  };
}

function api(fecha = fechaAbierta, store = almacen()) {
  return { store, handler: crearApiEstadisticas({ store, jugadores, ahora: () => new Date(fecha) }) };
}

function peticion(body = dato, method = 'POST') {
  return new Request('https://generador-equipos.netlify.app/api/estadisticas', {
    method,
    ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
  });
}

test('GET compartido informa reloj del servidor, ventana y registros de la semana', async () => {
  const { handler, store } = api();
  let respuesta = await handler(peticion(undefined, 'GET'));
  assert.equal(respuesta.status, 200);
  const inicial = await respuesta.json();
  assert.equal(inicial.habilitada, true);
  assert.equal(new Date(inicial.servidorAhora).getTime(), new Date(fechaAbierta).getTime());
  assert.equal(typeof inicial.semana, 'string');
  assert.deepEqual(inicial.registros, []);
  store.datos.set(`${inicial.semana}/1`, { ...dato, participaciones: 5 });
  store.datos.set('1900-01-01/2', { ...dato, jugadorId: 2 });
  respuesta = await handler(peticion(undefined, 'GET'));
  const actual = await respuesta.json();
  assert.equal(actual.registros.length, 1);
  assert.equal(actual.registros[0].jugadorId, 1);
});

test('POST persiste una estadística por jugador y calcula participaciones sin confiar en cliente', async () => {
  const { handler, store } = api();
  const respuesta = await handler(peticion({ ...dato, participaciones: 9999 }));
  assert.equal(respuesta.status, 201);
  assert.equal(store.datos.size, 1);
  const guardado = [...store.datos.values()][0];
  assert.equal(guardado.participaciones, 5);
  assert.equal(guardado.jugadorId, 1);
  assert.equal(guardado.mvp, true);
  const duplicado = await handler(peticion({ ...dato, goles: 8 }));
  assert.equal(duplicado.status, 409);
  assert.equal([...store.datos.values()][0].goles, 2);
});

test('dos cargas simultáneas del mismo jugador no sobrescriben el registro', async () => {
  const { handler, store } = api();
  const respuestas = await Promise.all([handler(peticion()), handler(peticion())]);
  assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]);
  assert.equal(store.datos.size, 1);
});

test('POST fuera de horario rechaza incluso fechas o banderas enviadas por el cliente', async () => {
  for (const fecha of ['2026-10-31T16:59:59-03:00', '2026-11-03T00:00:00-03:00', '2026-11-06T18:00:00-03:00']) {
    const { handler, store } = api(fecha);
    const respuesta = await handler(peticion({ ...dato, habilitada: true, servidorAhora: fechaAbierta }));
    assert.equal(respuesta.status, 403, fecha);
    assert.equal(store.datos.size, 0);
  }
});

test('POST rechaza jugador ajeno, contadores inválidos, MVP inválido y JSON roto', async () => {
  const { handler, store } = api();
  for (const cambio of [{ jugadorId: 99 }, { jugadorId: '1' }, { goles: -1 }, { goles: 1.1 }, { asistencias: '3' }, { mvp: 'true' }]) {
    const respuesta = await handler(peticion({ ...dato, ...cambio }));
    assert.equal(respuesta.status, 400, JSON.stringify(cambio));
  }
  const roto = await handler(new Request('https://generador-equipos.netlify.app/api/estadisticas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  }));
  assert.equal(roto.status, 400);
  assert.equal(store.datos.size, 0);
});

test('métodos no admitidos no modifican el almacenamiento', async () => {
  const { handler, store } = api();
  assert.equal((await handler(peticion(undefined, 'DELETE'))).status, 405);
  assert.equal(store.datos.size, 0);
});

test('errores de almacenamiento responden sin filtrar información interna', async () => {
  const fallo = () => { throw new Error('secreto-interno-de-almacenamiento'); };
  const { handler } = api(fechaAbierta, { list: fallo, get: fallo, setJSON: fallo });
  for (const method of ['GET', 'POST']) {
    const respuesta = await handler(peticion(dato, method));
    assert.equal(respuesta.status, 503);
    assert.doesNotMatch(await respuesta.text(), /secreto-interno/);
  }
});

test('POST rechaza origen cruzado, formato incorrecto y cuerpos demasiado grandes', async () => {
  const { handler, store } = api();
  const origenAjeno = await handler(new Request('https://generador-equipos.netlify.app/api/estadisticas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://otro.example' }, body: JSON.stringify(dato)
  }));
  assert.equal(origenAjeno.status, 403);
  const texto = await handler(new Request('https://generador-equipos.netlify.app/api/estadisticas', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(dato)
  }));
  assert.equal(texto.status, 415);
  const grande = await handler(peticion({ ...dato, relleno: 'x'.repeat(2100) }));
  assert.equal(grande.status, 413);
  assert.equal(store.datos.size, 0);
});

test('abrir el formulario antes del cierre no permite guardar después de medianoche', async () => {
  const store = almacen();
  const fechas = ['2026-11-02T23:59:59-03:00', '2026-11-03T00:00:00-03:00'];
  const handler = crearApiEstadisticas({ store, jugadores, ahora: () => new Date(fechas.shift()) });
  const respuesta = await handler(peticion());
  assert.equal(respuesta.status, 403);
  assert.equal(store.datos.size, 0);
});
