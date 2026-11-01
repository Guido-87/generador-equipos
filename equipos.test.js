import test from 'node:test';
import assert from 'node:assert/strict';
import { armarEquipos, algoritmoGenetico, jugadores, puntaje, FORMACIONES } from './equipos.js';

function validar(resultado, cantidad, lista = jugadores) {
  for (const equipo of [resultado.equipo1, resultado.equipo2]) {
    assert.equal(equipo.length, cantidad);
    for (const [pos, n] of Object.entries(FORMACIONES[`F${cantidad}`])) {
      assert.equal(equipo.filter(j => j.pos === pos).length, n);
    }
  }
  const todos = [...resultado.equipo1, ...resultado.equipo2, ...resultado.suplentes];
  assert.equal(new Set(todos.map(j => j.nombre)).size, lista.length);
  assert.deepEqual(todos.map(j => j.nombre).sort(), lista.map(j => j.nombre).sort());
  assert.ok(Math.abs(resultado.total1 - resultado.equipo1.reduce((s, j) => s + puntaje(j), 0)) < 1e-10);
  assert.ok(Math.abs(resultado.total2 - resultado.equipo2.reduce((s, j) => s + puntaje(j), 0)) < 1e-10);
}
test('lista exacta, valores de referencia y precisión del puntaje', () => {
  assert.deepEqual(jugadores.map(j => j.nombre), ['Edu','Agus','Guido','Nacho','Leo','Zapa','Cutu','Boni','Yorgiño','Naza','David','Agustín','Ale','Eli','Ariel','Santi','Antonio','Tobi']);
  assert.ok(Math.abs(puntaje(jugadores.find(j => j.nombre === 'Zapa')) - 7.95) < 1e-10);
  assert.ok(Math.abs(puntaje(jugadores.find(j => j.nombre === 'David')) - 7.75) < 1e-10);
});
test('cruce y mutación conservan formaciones y suplentes en varias semillas', () => {
  for (const cantidad of [5, 7, 9]) for (const seed of [0, 1, 42, 987]) {
    validar(armarEquipos(cantidad, { seed, tasaMutacion: 1, poblacion: 20, generaciones: 20 }), cantidad);
  }
});
test('F11 funciona con suficientes convocados, sin límite artificial de 22', () => {
  const lista = [...jugadores, ...['DEF','DEF','MED','MED'].map((pos, i) => ({ nombre: `Extra${i}`, pos, habilidad: 8, fisico: 8 }))];
  validar(armarEquipos(11, { convocados: lista }), 11, lista);
  const grande = Array.from({ length: 10 }, (_, k) => jugadores.map(j => ({ ...j, nombre: `${j.nombre}-${k}` }))).flat();
  validar(algoritmoGenetico(grande, { poblacion: 10, generaciones: 5 }), 9, grande);
});
test('validaciones de formato, datos, cupos y parámetros', () => {
  assert.throws(() => armarEquipos(11), /Se necesitan/);
  assert.throws(() => armarEquipos(8), /Formato/);
  assert.throws(() => algoritmoGenetico([...jugadores, jugadores[0]]), /repetidos/);
  assert.throws(() => algoritmoGenetico(jugadores.slice(1)), /ARQ/);
  assert.throws(() => algoritmoGenetico([{ ...jugadores[0], fisico: NaN }]), /fisico/);
  assert.throws(() => armarEquipos(9, { poblacion: 1 }), /poblacion/);
  assert.throws(() => armarEquipos(9, { generaciones: 0 }), /generaciones/);
  assert.throws(() => armarEquipos(9, { tasaMutacion: 2 }), /tasaMutacion/);
  assert.throws(() => armarEquipos(9, { seed: -1 }), /seed/);
});
test('semilla reproducible y entrada sin modificaciones', () => {
  const entrada = structuredClone(jugadores), copia = structuredClone(entrada);
  assert.deepEqual(algoritmoGenetico(entrada), algoritmoGenetico(entrada));
  assert.deepEqual(entrada, copia);
});
test('genético alcanza el óptimo F9 contrastado con oráculo exhaustivo independiente', () => {
  // Sólo en pruebas: todas las mitades posibles de cada posición, sin suplentes.
  function sumas(arr, n, inicio = 0, suma = 0) {
    if (n === 0) return [suma];
    return arr.flatMap((j, i) => i < inicio ? [] : sumas(arr, n - 1, i + 1, suma + puntaje(j)));
  }
  let totales = [0];
  for (const [pos, n] of Object.entries(FORMACIONES.F9)) {
    const opciones = sumas(jugadores.filter(j => j.pos === pos), n);
    totales = totales.flatMap(s => opciones.map(t => s + t));
  }
  const total = jugadores.reduce((s, j) => s + puntaje(j), 0);
  const optimo = Math.min(...totales.map(s => Math.abs(2 * s - total)));
  assert.ok(Math.abs(armarEquipos().diferencia - optimo) < 1e-10);
});
