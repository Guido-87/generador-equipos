const reloj = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit'
});

function partes(fecha) {
  if (!(fecha instanceof Date) || !Number.isFinite(fecha.getTime())) throw new Error('Fecha inválida');
  return Object.fromEntries(reloj.formatToParts(fecha).map(p => [p.type, p.value]));
}

export function cargaHabilitada(fecha = new Date()) {
  const p = partes(fecha);
  return (p.weekday === 'Sat' && Number(p.hour) >= 17) || p.weekday === 'Sun' || p.weekday === 'Mon';
}

// Identifica la jornada por el sábado más reciente, independientemente del dispositivo.
export function semanaActual(fecha = new Date()) {
  const p = partes(fecha);
  const dia = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  dia.setUTCDate(dia.getUTCDate() - (dia.getUTCDay() + 1) % 7);
  return dia.toISOString().slice(0, 10);
}

export function validarEstadistica(dato, jugadores) {
  if (!dato || !Number.isSafeInteger(dato.jugadorId) || !jugadores.some(j => j.id === dato.jugadorId)) {
    throw new Error('Elegí un jugador de la base permanente.');
  }
  for (const campo of ['goles', 'asistencias']) {
    if (!Number.isSafeInteger(dato[campo]) || dato[campo] < 0 || dato[campo] > 100) {
      throw new Error(`${campo} debe ser un entero entre 0 y 100.`);
    }
  }
  if (typeof dato.mvp !== 'boolean') throw new Error('MVP debe ser sí o no.');
  return { jugadorId: dato.jugadorId, goles: dato.goles, asistencias: dato.asistencias,
    participaciones: dato.goles + dato.asistencias, mvp: dato.mvp };
}
