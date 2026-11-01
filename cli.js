import { armarEquipos, puntaje } from './equipos.js';

try {
  const resultado = armarEquipos(Number(process.argv[2] ?? 9), { seed: Number(process.argv[3] ?? 42) });
  for (const [i, equipo] of [resultado.equipo1, resultado.equipo2].entries()) {
    console.log(`\nEQUIPO ${i + 1}`);
    for (const j of equipo) console.log(`${j.pos} - ${j.nombre} (${puntaje(j).toFixed(2)})`);
    console.log(`TOTAL: ${resultado[`total${i + 1}`].toFixed(2)}`);
  }
  console.log(`\nDiferencia: ${resultado.diferencia.toFixed(2)}`);
  console.log(`Suplentes: ${resultado.suplentes.map(j => j.nombre).join(', ') || 'ninguno'}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
