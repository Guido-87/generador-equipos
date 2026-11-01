# Generador de equipos

JavaScript para Node.js 22.12 o posterior, sin dependencias externas.

```sh
npm start
npm start -- 7 42
npm test
```

El primer argumento es la cantidad por equipo (5, 7, 9 u 11); el segundo es la semilla aleatoria. La semilla predeterminada es 42: cambiándola podés explorar otras distribuciones.

## Base y mejoras

Se conserva la base del primer algoritmo: genotipo con una asignación por jugador, población de 100, 200 generaciones, cruce uniforme, mutación de 0.10, selección entre la mitad mejor y elitismo del 20%. Del segundo se incorporan las formaciones, validaciones y la fórmula `habilidad * 0.7 + fisico * 0.3` sin el redondeo del original que perdía diferencias como 7.95.

Las posiciones son restricciones obligatorias: cada individuo se repara por posición después del cruce y de la mutación. Siempre hay un arquero por equipo y exactamente los cupos de la formación. Fitness sólo compara la diferencia de puntajes, y se calcula una vez por individuo, sin reconstruir equipos durante cada comparación del ordenamiento. Se termina anticipadamente cuando la diferencia es cero.

El algoritmo principal es genético. No se ejecuta búsqueda exhaustiva en producción. Las pruebas usan un oráculo exhaustivo independiente para contrastar el resultado F9 predeterminado; esto no garantiza que cualquier ejecución genética encuentre el óptimo. `optimoGarantizado` sólo es verdadero cuando se alcanza diferencia cero (tolerancia numérica 1e-10).

## Jugadores y convocados

`jugadores.json` contiene exactamente los 18 jugadores y valoraciones del segundo listado. JSON no admite `export const`. Se importa como JSON válido en módulos ES:

```js
import jugadores from './jugadores.json' with { type: 'json' };
import { armarEquipos } from './equipos.js';

const resultado = armarEquipos(9, { convocados: jugadores, seed: 42 });
console.log(resultado.equipo1, resultado.equipo2, resultado.diferencia);
```

Si preferís `export const jugadores = [...]`, el archivo debe llamarse `jugadores.js` y usarse como un módulo JavaScript; no es el formato elegido aquí.

Con F5/F7 se eligen titulares y se devuelve el resto en `suplentes`, sin duplicados. La prioridad es el equilibrio de puntajes entre los equipos; no se maximiza la fuerza de los titulares ni se rota automáticamente a los suplentes. Para decidir quién juega, pasá sólo los convocados deseados. Deben alcanzar los cupos de cada posición. Con los 18 actuales F11 falla con un error claro: hacen falta al menos 22, incluidos ocho defensores y ocho mediocampistas.

La API devuelve `equipo1`, `equipo2`, `suplentes`, `total1`, `total2`, `diferencia`, `algoritmo`, `generaciones`, `seed` y `optimoGarantizado`. Los datos de entrada no se modifican.

Los equipos y suplentes se devuelven ordenados por ARQ, DEF, MED y DEL, y por nombre dentro de cada posición. `salida.js` comparte el formato de columnas alineadas entre consola y navegador. `index.html` y `script.js` incluyen una vista sencilla para PlayCode; al subir `equipos.js` a su editor, quitá únicamente `with { type: 'json' }` de la importación JSON si su compilador lo requiere. El archivo del repositorio conserva esa sintaxis para Node.js.

```js
armarEquipos(7, { poblacion: 200, generaciones: 400, tasaMutacion: 0.15, seed: 123 });
```

Se admiten puntuaciones finitas entre 0 y 10 y nombres únicos. No existe el límite artificial original de 22 jugadores. El trabajo está acotado por población y generaciones; la reparación cuesta aproximadamente O(N) por individuo y ordenar la población O(P log P) por generación. No se materializan combinaciones de planteles grandes. Más población/generaciones implican más tiempo, sin garantía general de optimalidad.

## Pruebas

`npm test` verifica formaciones y suplentes bajo mutación alta y varias semillas, ausencia de duplicados, F11 con convocados adicionales, planteles grandes, validaciones, reproducibilidad, no modificación de entradas y comparación F9 contra el óptimo exhaustivo.
