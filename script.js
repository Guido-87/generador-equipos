import { armarEquipos } from './equipos.js';
import { formatearResultado } from './salida.js';

let seed = 42;
function generar() {
  const salida = document.querySelector('#resultado');
  try {
    salida.textContent = formatearResultado(armarEquipos(
      Number(document.querySelector('#formato').value), { seed: seed++ }
    ));
  } catch (error) { salida.textContent = error.message; }
}
document.querySelector('#generar').addEventListener('click', generar);
generar();
