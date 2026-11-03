import { jugadores } from './equipos.js';
import { cargaHabilitada, validarEstadistica } from './estadisticas.js';

const $ = selector => document.querySelector(selector);
const modal = $('#modal-estadisticas'), form = $('#form-estadisticas');
const abrir = $('#agregar-estadistica'), guardar = $('#guardar-estadistica');
let datos, referencia, recibido, guardando = false;

function texto(tag, valor) {
  const elemento = document.createElement(tag); elemento.textContent = valor; return elemento;
}
function mensaje(valor) { $('#estadisticas-mensaje').textContent = valor; }
function disponible() {
  return Boolean(datos?.habilitada && cargaHabilitada(new Date(referencia + performance.now() - recibido)));
}
function horario() {
  const abierta = disponible();
  abrir.disabled = !abierta;
  guardar.disabled = !abierta || guardando;
  $('#estadisticas-horario').textContent = !datos ? 'Consultando disponibilidad…' : abierta
    ? 'Carga habilitada · hasta el lunes 23:59 (Argentina).'
    : 'Carga cerrada · de sábado 17:00 a lunes 23:59 (Argentina).';
  if (modal.open && !abierta) $('#estadisticas-error').textContent = 'La carga está cerrada. Tus datos todavía no se guardaron.';
}
function renderizar() {
  const opciones = jugadores.map(j => {
    const opcion = texto('option', `#${j.id} ${j.nombre}`); opcion.value = String(j.id);
    opcion.disabled = datos.registros.some(r => r.jugadorId === j.id);
    if (opcion.disabled) opcion.textContent += ' · ya cargado';
    return opcion;
  });
  $('#estadistica-jugador').replaceChildren(texto('option', 'Elegí un jugador'), ...opciones);
  $('#estadistica-jugador').firstElementChild.value = '';
  $('#estadisticas-semana').textContent = `Jornada del sábado ${datos.semana.split('-').reverse().join('/')}`;
  const filas = jugadores.map(j => {
    const registro = datos.registros.find(r => r.jugadorId === j.id);
    const fila = document.createElement('tr');
    fila.append(texto('th', j.nombre), ...[registro?.goles ?? '—', registro?.asistencias ?? '—',
      registro?.participaciones ?? '—', registro ? registro.mvp ? 'Sí' : 'No' : '—'].map(v => texto('td', v)));
    fila.firstElementChild.scope = 'row';
    return fila;
  });
  $('#estadisticas-filas').replaceChildren(...filas);
}
async function consultar() {
  try {
    const respuesta = await fetch('/api/estadisticas', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!respuesta.ok) throw new Error('Las estadísticas compartidas no están disponibles. Volvé a intentar.');
    const nueva = await respuesta.json();
    const hora = Date.parse(nueva.servidorAhora);
    if (!Number.isFinite(hora) || !Array.isArray(nueva.registros)) throw new Error('No se pudo leer la respuesta de estadísticas.');
    datos = nueva; referencia = hora; recibido = performance.now();
    // No reemplazar el jugador elegido mientras alguien está completando el formulario.
    if (!modal.open) renderizar();
    mensaje(''); horario();
    return true;
  } catch (e) {
    datos = undefined; abrir.disabled = true; guardar.disabled = true;
    $('#estadisticas-horario').textContent = 'No se pudo comprobar el horario de carga.';
    mensaje(e.message); return false;
  }
}
abrir.addEventListener('click', async () => {
  if (!await consultar() || !disponible()) return;
  form.reset(); $('#participaciones').value = '0'; $('#estadisticas-error').textContent = '';
  modal.showModal();
});
$('#cerrar-estadisticas').addEventListener('click', () => { if (!guardando) modal.close(); });
modal.addEventListener('cancel', e => { if (guardando) e.preventDefault(); });
form.addEventListener('input', () => {
  const goles = Number(form.elements.goles.value), asistencias = Number(form.elements.asistencias.value);
  $('#participaciones').value = Number.isFinite(goles + asistencias) ? String(goles + asistencias) : '0';
});
form.addEventListener('submit', async e => {
  e.preventDefault(); if (guardando || !form.reportValidity()) return;
  const error = $('#estadisticas-error'); error.textContent = '';
  try {
    if (!disponible()) throw new Error('La carga está cerrada.');
    const dato = validarEstadistica({ jugadorId: Number(form.elements.jugadorId.value),
      goles: Number(form.elements.goles.value), asistencias: Number(form.elements.asistencias.value), mvp: form.elements.mvp.checked }, jugadores);
    guardando = true; guardar.disabled = true; $('#cerrar-estadisticas').disabled = true;
    const respuesta = await fetch('/api/estadisticas', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dato), signal: AbortSignal.timeout(15000) });
    const resultado = await respuesta.json();
    if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo guardar.');
    modal.close();
    const recargada = await consultar();
    if (recargada) mensaje('Estadísticas guardadas y compartidas con todos.');
    else mensaje('Estadísticas guardadas. No se pudo actualizar la lista; pulsá Actualizar.');
  } catch (e) { error.textContent = e.message; }
  finally { guardando = false; $('#cerrar-estadisticas').disabled = false; horario(); }
});
$('#actualizar-estadisticas').addEventListener('click', consultar);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !modal.open) consultar(); });
setInterval(() => { if (datos) horario(); }, 1000);
consultar();
