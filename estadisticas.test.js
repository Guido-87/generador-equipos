import test from 'node:test';
import assert from 'node:assert/strict';
import { cargaHabilitada, validarEstadistica } from './estadisticas.js';

test('ventana semanal usa horario argentino y límites exactos', () => {
  for (const [fecha, abierto] of [
    ['2026-10-31T16:59:59-03:00', false],
    ['2026-10-31T17:00:00-03:00', true],
    ['2026-11-01T12:00:00-03:00', true],
    ['2026-11-02T23:59:59-03:00', true],
    ['2026-11-03T00:00:00-03:00', false],
    ['2026-11-06T18:00:00-03:00', false],
    ['2026-11-07T19:59:59Z', false],
    ['2026-11-07T20:00:00Z', true]
  ]) assert.equal(cargaHabilitada(new Date(fecha)), abierto, fecha);
  assert.throws(() => cargaHabilitada(new Date('invalid')), /Fecha/);
});

test('estadística valida jugador, enteros no negativos y calcula participaciones', () => {
  const jugadores = [{ id: 1 }];
  const dato = { jugadorId: 1, goles: 2, asistencias: 3, mvp: true };
  assert.deepEqual(validarEstadistica(dato, jugadores), { ...dato, participaciones: 5 });
  for (const cambio of [{ jugadorId: 2 }, { jugadorId: '1' }, { goles: -1 }, { goles: 1.2 }, { goles: NaN }, { asistencias: '2' }, { mvp: 'si' }, { goles: Number.MAX_SAFE_INTEGER }]) {
    assert.throws(() => validarEstadistica({ ...dato, ...cambio }, jugadores));
  }
});
