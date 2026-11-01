import { armarEquipos } from './equipos.js';
import { formatearResultado } from './salida.js';

try {
  const resultado = armarEquipos(Number(process.argv[2] ?? 9), { seed: Number(process.argv[3] ?? 42) });
  console.log(formatearResultado(resultado));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
