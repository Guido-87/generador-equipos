import { cargaHabilitada, semanaActual, validarEstadistica } from './estadisticas.js';

const responder = (datos, status = 200) => Response.json(datos, { status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

// Inyección del almacén y reloj para verificar la API sin tocar estadísticas reales.
export function crearApiEstadisticas({ store, jugadores, ahora = () => new Date() }) {
  return async req => {
    const fecha = ahora();
    const habilitada = cargaHabilitada(fecha), semana = semanaActual(fecha);
    if (!['GET', 'POST'].includes(req.method)) return responder({ error: 'Método no permitido.' }, 405);
    try {
      if (req.method === 'GET') {
        const listado = await store.list({ prefix: `${semana}/` });
        const registros = (await Promise.all(listado.blobs.map(b => store.get(b.key, { type: 'json' })))).filter(Boolean);
        return responder({ habilitada, servidorAhora: fecha.toISOString(), semana, registros });
      }
      if (!habilitada) return responder({ error: 'La carga está habilitada de sábado 17:00 a lunes 23:59 (Argentina).' }, 403);
      const origen = req.headers.get('origin');
      if (origen && origen !== new URL(req.url).origin) return responder({ error: 'Origen no permitido.' }, 403);
      if (!req.headers.get('content-type')?.startsWith('application/json')) return responder({ error: 'Enviá los datos en formato JSON.' }, 415);
      // Acotar lectura antes de decodificar; no confiar sólo en Content-Length.
      const lector = req.body?.getReader();
      if (!lector) return responder({ error: 'Faltan datos.' }, 400);
      const chunks = []; let longitud = 0;
      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        longitud += value.byteLength;
        if (longitud > 2048) { await lector.cancel(); return responder({ error: 'La solicitud es demasiado grande.' }, 413); }
        chunks.push(value);
      }
      let dato;
      try {
        const bytes = new Uint8Array(longitud); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        dato = validarEstadistica(JSON.parse(new TextDecoder().decode(bytes)), jugadores);
      } catch (e) { return responder({ error: e instanceof SyntaxError ? 'JSON inválido.' : e.message }, 400); }
      // Revalidar al guardar: un formulario abierto no extiende el horario permitido.
      const guardado = ahora();
      if (!cargaHabilitada(guardado) || semanaActual(guardado) !== semana) return responder({ error: 'Terminó el horario de carga. Volvé a abrir el formulario.' }, 403);
      const registro = { ...dato, semana, actualizado: guardado.toISOString() };
      const resultado = await store.setJSON(`${semana}/${dato.jugadorId}`, registro, { onlyIfNew: true });
      if (!resultado.modified) return responder({ error: 'Este jugador ya tiene estadísticas cargadas para esta jornada.' }, 409);
      return responder({ registro }, 201);
    } catch {
      return responder({ error: 'No se pudieron consultar o guardar las estadísticas. Intentá de nuevo.' }, 503);
    }
  };
}
