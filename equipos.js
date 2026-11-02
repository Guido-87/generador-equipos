import lista from './jugadores.json' with { type: 'json' };

export const FORMACIONES = Object.freeze({
  F5: Object.freeze({ ARQ: 1, DEF: 1, MED: 2, DEL: 1 }),
  F7: Object.freeze({ ARQ: 1, DEF: 2, MED: 2, DEL: 2 }),
  F9: Object.freeze({ ARQ: 1, DEF: 3, MED: 3, DEL: 2 }),
  F11: Object.freeze({ ARQ: 1, DEF: 4, MED: 4, DEL: 2 })
});
export const jugadores = Object.freeze(lista.map(j => Object.freeze({ ...j })));
export function puntaje(j) { return j.habilidad * 0.7 + j.fisico * 0.3; }

function aleatorio(seed) {
  let estado = seed >>> 0;
  return () => {
    estado += 0x6D2B79F5;
    let t = Math.imul(estado ^ estado >>> 15, 1 | estado);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mezclar(array, random) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Genotipo original: un destino por jugador. 0/1 = equipos, 2 = suplentes.
// La reparación hace obligatorias las posiciones, antes penalizadas en fitness.
function reparar(individuo, grupos, formacion, random) {
  for (const [pos, indices] of Object.entries(grupos)) {
    const cupos = [formacion[pos], formacion[pos], indices.length - 2 * formacion[pos]];
    const pendientes = [];
    for (const i of mezclar(indices, random)) {
      const destino = individuo[i];
      if (cupos[destino] > 0) cupos[destino]--;
      else pendientes.push(i);
    }
    const destinos = cupos.flatMap((n, destino) => Array(n).fill(destino));
    pendientes.forEach((i, k) => { individuo[i] = destinos[k]; });
  }
  return individuo;
}

export function algoritmoGenetico(convocados = jugadores, opciones = {}) {
  const { modalidad = 'F9', poblacion: tamanio = 100, generaciones = 200,
    tasaMutacion = 0.10, seed = 42 } = opciones;
  if (!Object.hasOwn(FORMACIONES, modalidad)) throw new Error('Formato no soportado: usá F5, F7, F9 o F11');
  const formacion = FORMACIONES[modalidad];
  for (const [nombre, valor, minimo] of [['poblacion', tamanio, 2], ['generaciones', generaciones, 1]]) {
    if (!Number.isSafeInteger(valor) || valor < minimo) throw new Error(`${nombre} debe ser un entero >= ${minimo}`);
  }
  if (!Number.isFinite(tasaMutacion) || tasaMutacion < 0 || tasaMutacion > 1) throw new Error('tasaMutacion debe estar entre 0 y 1');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new Error('seed debe ser un entero de 32 bits sin signo');
  if (!Array.isArray(convocados)) throw new Error('convocados debe ser una lista');
  const grupos = Object.fromEntries(Object.keys(formacion).map(pos => [pos, []]));
  const nombres = new Set();
  const ids = new Set();
  convocados.forEach((j, i) => {
    if (!j || typeof j.nombre !== 'string' || !j.nombre.trim() || nombres.has(j.nombre)) throw new Error('Nombres inválidos o repetidos');
    nombres.add(j.nombre);
    if (Object.hasOwn(j, 'id')) {
      if (!Number.isSafeInteger(j.id) || j.id < 1 || ids.has(j.id)) throw new Error('IDs inválidos o repetidos: deben ser enteros positivos únicos');
      ids.add(j.id);
    }
    if (!Object.hasOwn(grupos, j.pos)) throw new Error(`Posición inválida: ${j.pos}`);
    for (const campo of ['habilidad', 'fisico']) {
      if (!Number.isFinite(j[campo]) || j[campo] < 0 || j[campo] > 10) throw new Error(`${campo} debe estar entre 0 y 10`);
    }
    grupos[j.pos].push(i);
  });
  for (const [pos, n] of Object.entries(formacion)) {
    if (grupos[pos].length < 2 * n) throw new Error(`Se necesitan ${2 * n} jugadores ${pos}; hay ${grupos[pos].length}`);
  }
  const random = aleatorio(seed);
  const puntajes = convocados.map(puntaje);
  const fitness = individuo => {
    let diferencia = 0;
    individuo.forEach((equipo, i) => { if (equipo < 2) diferencia += (equipo === 0 ? 1 : -1) * puntajes[i]; });
    return Math.abs(diferencia);
  };
  const evaluar = genes => ({ genes, fitness: fitness(genes) });
  let poblacion = Array.from({ length: tamanio }, () => evaluar(reparar(
    Array(convocados.length).fill(2), grupos, formacion, random)));
  const elite = Math.max(1, Math.floor(tamanio * 0.2));
  let realizadas = 0;
  for (; realizadas < generaciones; realizadas++) {
    poblacion.sort((a, b) => a.fitness - b.fitness);
    if (poblacion[0].fitness < 1e-10) break;
    const nueva = poblacion.slice(0, elite);
    const limite = Math.max(2, Math.ceil(tamanio / 2));
    while (nueva.length < tamanio) {
      const padre1 = poblacion[Math.floor(random() * limite)].genes;
      const padre2 = poblacion[Math.floor(random() * limite)].genes;
      const hijo = padre1.map((destino, i) => random() < 0.5 ? destino : padre2[i]);
      for (let i = 0; i < hijo.length; i++) {
        if (random() < tasaMutacion) hijo[i] = Math.floor(random() * 3);
      }
      nueva.push(evaluar(reparar(hijo, grupos, formacion, random)));
    }
    poblacion = nueva;
  }
  poblacion.sort((a, b) => a.fitness - b.fitness);
  const mejor = poblacion[0];
  const equipos = [[], [], []];
  mejor.genes.forEach((destino, i) => equipos[destino].push({ ...convocados[i] }));
  const orden = { ARQ: 0, DEF: 1, MED: 2, DEL: 3 };
  for (const equipo of equipos) {
    equipo.sort((a, b) => orden[a.pos] - orden[b.pos] || a.nombre.localeCompare(b.nombre, 'es'));
  }
  const total = equipo => equipo.reduce((s, j) => s + puntaje(j), 0);
  const total1 = total(equipos[0]), total2 = total(equipos[1]);
  return { equipo1: equipos[0], equipo2: equipos[1], suplentes: equipos[2],
    total1, total2, diferencia: Math.abs(total1 - total2),
    algoritmo: 'genetico', generaciones: realizadas, seed,
    optimoGarantizado: mejor.fitness < 1e-10 };
}
export function armarEquipos(cantidad = 9, opciones = {}) {
  const { convocados = jugadores, ...config } = opciones;
  return algoritmoGenetico(convocados, { ...config, modalidad: `F${cantidad}` });
}
