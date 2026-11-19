import { createHash, timingSafeEqual } from 'node:crypto';

const REPO = 'Guido-87/generador-equipos';
const PATH = 'jugadores.json';
const BRANCH = 'main';
const POSICIONES = new Set(['ARQ', 'DEF', 'MED', 'DEL']);
const SIN_CACHE = { 'Cache-Control': 'no-store' };

function respuesta(status, error) {
  return Response.json(error ? { error } : { guardado: true }, { status, headers: SIN_CACHE });
}

function normalizar(lista) {
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > 200) throw new Error('La base debe tener entre 1 y 200 jugadores.');
  const ids = new Set();
  return lista.map(j => {
    if (!j || typeof j !== 'object' || !Number.isSafeInteger(j.id) || j.id < 1 || ids.has(j.id)) throw new Error('Hay IDs inválidos o repetidos.');
    ids.add(j.id);
    if (typeof j.nombre !== 'string' || !j.nombre.trim() || j.nombre.trim().length > 80) throw new Error(`Nombre inválido para el ID ${j.id}.`);
    if (!POSICIONES.has(j.pos)) throw new Error(`Posición inválida para el ID ${j.id}.`);
    if (![j.habilidad, j.fisico].every(n => Number.isFinite(n) && n >= 0 && n <= 10)) throw new Error(`Puntajes inválidos para el ID ${j.id}.`);
    return { id: j.id, nombre: j.nombre.trim(), pos: j.pos, habilidad: j.habilidad, fisico: j.fisico };
  });
}

function claveIgual(ingresada, esperada) {
  if (typeof ingresada !== 'string' || !esperada) return false;
  const a = createHash('sha256').update(ingresada).digest();
  const b = createHash('sha256').update(esperada).digest();
  return timingSafeEqual(a, b);
}

export function crearApiJugadores({ env = process.env, fetchImpl = fetch } = {}) {
  return async request => {
    if (request.method !== 'POST') return respuesta(405, 'Método no permitido.');
    if (env.URL && request.headers.has('origin')) {
      try { if (new URL(request.headers.get('origin')).origin !== new URL(env.URL).origin) return respuesta(403, 'Origen no permitido.'); }
      catch { return respuesta(403, 'Origen no permitido.'); }
    }
    const token = env.GITHUB_TOKEN, clave = env.JUGADORES_ADMIN_KEY;
    if (!token || !clave) return respuesta(503, 'El guardado automático todavía no está configurado.');
    if (Buffer.byteLength(clave) < 32) return respuesta(503, 'La clave de administración debe tener al menos 32 caracteres aleatorios.');
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return respuesta(415, 'Se esperaba contenido JSON.');

    let datos;
    try {
      const body = await request.text();
      if (Buffer.byteLength(body) > 32_768) return respuesta(413, 'La base enviada es demasiado grande.');
      datos = JSON.parse(body);
    }
    catch (e) { return respuesta(400, e instanceof SyntaxError ? 'El contenido JSON no es válido.' : 'No se pudo leer el contenido enviado.'); }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return respuesta(400, 'El contenido enviado no es válido.');
    if (!claveIgual(datos.claveAdmin, clave)) return respuesta(401, 'Clave de administración incorrecta.');
    let jugadores;
    try { jugadores = normalizar(datos.jugadores); }
    catch (e) { return respuesta(400, e.message); }

    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${PATH}`;
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    let actual;
    try {
      const lectura = await fetchImpl(`${apiUrl}?ref=${BRANCH}`, { headers, signal: AbortSignal.timeout(10_000) });
      if (!lectura.ok) return respuesta(502, 'No se pudo leer la base actual de GitHub.');
      const archivo = await lectura.json();
      actual = normalizar(JSON.parse(Buffer.from(archivo.content, 'base64').toString('utf8')));
      const porId = new Map(jugadores.map(j => [j.id, j]));
      for (const anterior of actual) {
        const enviado = porId.get(anterior.id);
        if (!enviado || JSON.stringify(enviado) !== JSON.stringify(anterior)) return respuesta(409, 'La base cambió o se intentó quitar/modificar un jugador existente. Recargá y revisá la lista.');
      }
      const maximo = Math.max(...actual.map(j => j.id));
      if (jugadores.some(j => !actual.some(a => a.id === j.id) && j.id <= maximo)) return respuesta(409, 'Los jugadores nuevos deben usar IDs mayores al último ID guardado.');

      const contenido = Buffer.from(`${JSON.stringify(jugadores, null, 2)}\n`).toString('base64');
      const escritura = await fetchImpl(apiUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Actualizar jugadores.json desde el generador', content: contenido, sha: archivo.sha, branch: BRANCH }),
        signal: AbortSignal.timeout(10_000)
      });
      if (escritura.status === 409 || escritura.status === 422) return respuesta(409, 'GitHub detectó otro cambio simultáneo. Recargá la página y volvé a guardar.');
      if (!escritura.ok) return respuesta(502, 'GitHub no pudo guardar la base. Revisá que el token tenga Contents: Read and write y que la rama main permita el cambio.');
      return respuesta(200);
    } catch {
      return respuesta(502, 'No se pudo completar el guardado en GitHub.');
    }
  };
}
