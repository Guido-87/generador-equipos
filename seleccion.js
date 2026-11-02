import { FORMACIONES } from './equipos.js';

// Los IDs se almacenan en la base: nunca dependen del orden de la lista.
export function seleccionarPorIds(texto, base) {
  if (typeof texto !== 'string' || !texto.trim()) throw new Error('Ingresá al menos un ID de jugador.');
  if (!Array.isArray(base)) throw new Error('La base de jugadores debe ser una lista.');
  const porId = new Map();
  for (const jugador of base) {
    if (!jugador || !Number.isSafeInteger(jugador.id) || jugador.id < 1 || porId.has(jugador.id)) {
      throw new Error('La base contiene IDs inválidos o repetidos.');
    }
    porId.set(jugador.id, jugador);
  }
  const tokens = texto.trim().split(/[\s,;]+/);
  const usados = new Set();
  return tokens.map(token => {
    if (!/^[1-9]\d*$/.test(token) || !Number.isSafeInteger(Number(token))) {
      throw new Error(`ID inválido: ${token}. Usá enteros positivos separados por espacios, comas o punto y coma.`);
    }
    const id = Number(token);
    if (usados.has(id)) throw new Error(`ID repetido: ${id}.`);
    if (!porId.has(id)) throw new Error(`No existe un jugador con ID ${id}.`);
    usados.add(id);
    return porId.get(id);
  });
}

export function validarSeleccion(lista, cantidad) {
  const modalidad = `F${cantidad}`;
  if (!Object.hasOwn(FORMACIONES, modalidad)) throw new Error('Formato no soportado: usá F5, F7, F9 o F11.');
  if (!Array.isArray(lista)) throw new Error('La selección debe ser una lista.');
  if (lista.length < 10 || lista.length > 22) throw new Error('Seleccioná entre 10 y 22 jugadores.');
  if (lista.length < 2 * cantidad) throw new Error(`Para ${modalidad} se necesitan al menos ${2 * cantidad} jugadores; seleccionaste ${lista.length}.`);
  const ids = new Set();
  const grupos = { ARQ: 0, DEF: 0, MED: 0, DEL: 0 };
  for (const jugador of lista) {
    if (!jugador || !Number.isSafeInteger(jugador.id) || jugador.id < 1 || ids.has(jugador.id)) {
      throw new Error('La selección contiene IDs inválidos o repetidos.');
    }
    ids.add(jugador.id);
    if (!Object.hasOwn(grupos, jugador.pos)) throw new Error(`Posición inválida para el jugador ${jugador.id}.`);
    grupos[jugador.pos]++;
  }
  for (const [pos, cupos] of Object.entries(FORMACIONES[modalidad])) {
    if (grupos[pos] < 2 * cupos) throw new Error(`Para ${modalidad} se necesitan ${2 * cupos} jugadores ${pos}; seleccionaste ${grupos[pos]}.`);
  }
  return lista;
}
