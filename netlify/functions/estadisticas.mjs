import { getStore } from '@netlify/blobs';
import jugadores from '../../jugadores.json' with { type: 'json' };
import { crearApiEstadisticas } from '../../estadisticas-api.js';

export default async req => {
  try {
    const store = getStore({ name: 'estadisticas-jugadores', consistency: 'strong' });
    return await crearApiEstadisticas({ store, jugadores })(req);
  } catch {
    return Response.json({ error: 'El almacenamiento compartido no está disponible.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' }
    });
  }
};

export const config = { path: '/api/estadisticas' };
