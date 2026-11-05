import test from 'node:test';
import assert from 'node:assert/strict';
import { jugadores, armarEquipos, algoritmoGenetico } from './equipos.js';
import { seleccionarPorIds, validarSeleccion } from './seleccion.js';

const idsF5 = '1 2 3 4 9 10 11 13 12 16';
const extras = ['DEF', 'DEF', 'MED', 'MED'].map((pos, i) => ({
  id: 19 + i, nombre: `Extra ${i}`, pos, habilidad: 8, fisico: 8
}));

test('IDs explícitos desde 1, independientes del orden de la base', () => {
  assert.deepEqual(jugadores.map(j => j.id), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(seleccionarPorIds('18, 1; 9', [...jugadores].reverse()).map(j => j.nombre), ['Tobi', 'Edu', 'Yorgiño']);
  assert.deepEqual(seleccionarPorIds('1\n2\t3', jugadores).map(j => j.id), [1, 2, 3]);
});

test('entrada manual rechaza IDs ambiguos, inexistentes, repetidos y código', () => {
  for (const entrada of ['', ' ', '0', '-1', '1.5', '1e1', '0x10', '+1', '01', '99999999999999999999', '1 1', '25', '1+2', '<img src=x onerror=alert(1)>']) {
    assert.throws(() => seleccionarPorIds(entrada, jugadores), Error, entrada);
  }
  assert.throws(() => seleccionarPorIds('1', [...jugadores, jugadores[0]]), /base/);
  assert.throws(() => seleccionarPorIds('1', [{ ...jugadores[0], id: 0 }]), /base/);
});

test('selección valida cantidades y cupos para las cuatro modalidades', () => {
  const f5 = seleccionarPorIds(idsF5, jugadores);
  assert.equal(validarSeleccion(f5, 5), f5);
  const convocados = jugadores.slice(0, 18);
  assert.doesNotThrow(() => validarSeleccion(convocados, 7));
  assert.doesNotThrow(() => validarSeleccion(convocados, 9));
  assert.doesNotThrow(() => validarSeleccion([...convocados, ...extras], 11));
  assert.throws(() => validarSeleccion(jugadores.slice(0, 9), 5), /10 y 22/);
  assert.throws(() => validarSeleccion(jugadores, 11), /10 y 22/);
  assert.throws(() => validarSeleccion(f5, 7), /14/);
  assert.throws(() => validarSeleccion(jugadores, 11), /22/);
  assert.throws(() => validarSeleccion(jugadores.slice(0, 10), 5), /MED/);
  assert.throws(() => validarSeleccion(convocados.filter(j => j.id !== 1), 5), /ARQ/);
  assert.throws(() => validarSeleccion([...f5.slice(1), f5[1]], 5), /IDs/);
  assert.throws(() => validarSeleccion(jugadores, 8), /Formato/);
  assert.throws(() => validarSeleccion(null, 5), /lista/);
});

test('algoritmo conserva los IDs elegidos en titulares y suplentes sin modificar entrada', () => {
  const diez = seleccionarPorIds(idsF5, jugadores);
  const f5 = armarEquipos(5, { convocados: validarSeleccion(diez, 5) });
  assert.equal(f5.suplentes.length, 0);
  assert.deepEqual([...f5.equipo1, ...f5.equipo2].map(j => j.id).sort((a, b) => a - b), diez.map(j => j.id).sort((a, b) => a - b));
  for (const cantidad of [5, 7, 9, 11]) {
    const base = cantidad === 11 ? [...jugadores.slice(0, 18), ...extras] : jugadores.slice(0, 18);
    const copia = structuredClone(base);
    validarSeleccion(base, cantidad);
    const r = armarEquipos(cantidad, { convocados: base, poblacion: 10, generaciones: 5 });
    const salida = [...r.equipo1, ...r.equipo2, ...r.suplentes];
    assert.deepEqual(salida.map(j => j.id).sort((a, b) => a - b), base.map(j => j.id).sort((a, b) => a - b));
    assert.deepEqual(base, copia);
  }
});

test('algoritmo rechaza IDs inválidos, duplicados y modalidades heredadas', () => {
  for (const id of [0, -1, 1.1, NaN, '1', 2]) {
    assert.throws(() => algoritmoGenetico([{ ...jugadores[0], id }, ...jugadores.slice(1)]), /ID/);
  }
  assert.throws(() => algoritmoGenetico(jugadores, { modalidad: 'toString' }), /Formato/);
});




