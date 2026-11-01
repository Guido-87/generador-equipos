import { puntaje } from './equipos.js';

export function formatearResultado(resultado) {
  const todos = [...resultado.equipo1, ...resultado.equipo2, ...resultado.suplentes];
  const ancho = Math.max('Jugador'.length, ...todos.map(j => j.nombre.length));
  const fila = (pos, nombre, valor) => `${pos.padEnd(3)}  ${nombre.padEnd(ancho)}  ${valor.padStart(7)}`;
  const bloques = [resultado.equipo1, resultado.equipo2].map((equipo, i) => [
    `EQUIPO ${i + 1}`,
    fila('Pos', 'Jugador', 'Puntaje'),
    ...equipo.map(j => fila(j.pos, j.nombre, puntaje(j).toFixed(2))),
    `TOTAL: ${resultado[`total${i + 1}`].toFixed(2)}`
  ].join('\n'));
  return `${bloques.join('\n\n')}\n\nDiferencia: ${resultado.diferencia.toFixed(2)}\nSuplentes: ${resultado.suplentes.map(j => j.nombre).join(', ') || 'ninguno'}`;
}
