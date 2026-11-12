import { armarEquipos, jugadores, puntaje, FORMACIONES } from './equipos.js';
import { seleccionarPorIds, validarSeleccion } from './seleccion.js';
const $ = s => document.querySelector(s);
let base = jugadores.map(j => ({ ...j }));
const CLAVE_SELECCION = 'generador-equipos-seleccion-v1';
function cargarSeleccion() {
  try {
    const ids = JSON.parse(localStorage.getItem(CLAVE_SELECCION) || '[]');
    if (!Array.isArray(ids)) return new Set();
    const disponibles = new Set(base.map(j => j.id));
    return new Set(ids.filter(id => Number.isSafeInteger(id) && disponibles.has(id)).slice(0, 22));
  } catch { return new Set(); }
}
const seleccionados = cargarSeleccion();
let pendientes = false;
function recordarSeleccion() {
  try { localStorage.setItem(CLAVE_SELECCION, JSON.stringify([...seleccionados])); } catch { /* El generador sigue funcionando si el navegador bloquea el almacenamiento local. */ }
}
// Media visual truncada; el algoritmo conserva el puntaje original.
function media(j) { return String(Math.min(99, Math.floor(puntaje(j) * 10 + 1e-9))).padStart(2, '0'); }
function posicionEnNombre(j) { return j.nombre.toLocaleUpperCase('es').endsWith(` ${j.pos}`); }
function nodo(tag, texto, clase) { const n = document.createElement(tag); if (texto !== undefined) n.textContent = texto; if (clase) n.className = clase; return n; }
function limpiar() { $('#error').hidden = true; $('#resultado').replaceChildren(); $('#panel-resultado').hidden = true; $('#panel-jugadores').hidden = false; }
function error(e) { $('#error').textContent = e.message; $('#error').hidden = false; $('#error').focus(); }
function actualizarSeleccionMasiva() {
  const control = $('#seleccionar-todos');
  const elegibles = base.slice(0, 22);
  const cantidadMarcada = elegibles.filter(j => seleccionados.has(j.id)).length;
  control.checked = elegibles.length > 0 && cantidadMarcada === elegibles.length;
  control.indeterminate = seleccionados.size > 0 && !control.checked;
}
function actualizar() {
  recordarSeleccion();
  $('#ids').value = [...seleccionados].sort((a,b) => a-b).join(' '); pendientes = false;
  $('#contador').textContent = `${seleccionados.size} seleccionados de ${base.length}`;
  $('#jugadores').replaceChildren();
  for (const j of base) {
    const label = nodo('label', undefined, 'player'), check = document.createElement('input'), datos = nodo('span');
    check.type = 'checkbox'; check.checked = seleccionados.has(j.id);
    datos.append(nodo('strong', `#${j.id} ${j.nombre}`), nodo('small', `${posicionEnNombre(j) ? '' : `${j.pos} · `}Media ${media(j)}`));
    check.addEventListener('change', () => {
      if (check.checked && seleccionados.size >= 22) { check.checked = false; error(new Error('Podés seleccionar como máximo 22 jugadores.')); return; }
      if (check.checked) seleccionados.add(j.id); else seleccionados.delete(j.id);
      recordarSeleccion();
      actualizarSeleccionMasiva();
      // Conservar foco al actualizar la selección.
      $('#ids').value = [...seleccionados].sort((a,b) => a-b).join(' '); pendientes = false;
      $('#contador').textContent = `${seleccionados.size} seleccionados de ${base.length}`; limpiar();
    });
    label.append(check, datos); $('#jugadores').append(label);
  }
  actualizarSeleccionMasiva();
  limpiar();
}
function cupos() { const c = Number($('#formato').value); $('#cupos').textContent = `${c*2} titulares. Por equipo: ${Object.entries(FORMACIONES[`F${c}`]).filter(([, n]) => n > 0).map(([p,n]) => `${n} ${p}`).join(' · ')}.`; limpiar(); }
$('#ids').addEventListener('input', () => { pendientes = true; limpiar(); });
$('#aplicar').addEventListener('click', () => { try { const lista = seleccionarPorIds($('#ids').value, base); if (lista.length > 22) throw new Error('Podés seleccionar como máximo 22 jugadores.'); seleccionados.clear(); lista.forEach(j => seleccionados.add(j.id)); actualizar(); } catch(e) { error(e); } });
$('#seleccionar-todos').addEventListener('change', e => {
  seleccionados.clear();
  if (e.currentTarget.checked) base.slice(0, 22).forEach(j => seleccionados.add(j.id));
  actualizar();
});
$('#formato').addEventListener('change', cupos); $('#seed').addEventListener('input', limpiar);
function elementoSvg(svg, grupo, etiqueta, atributos = {}, texto) {
  const elemento = document.createElementNS('http://www.w3.org/2000/svg', etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) elemento.setAttribute(clave, valor);
  if (texto !== undefined) elemento.textContent = texto;
  grupo.append(elemento); return elemento;
}
function cancha(r) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 800 620'); svg.setAttribute('class', 'pitch-svg');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-labelledby', 'cancha-titulo cancha-descripcion');
  elementoSvg(svg, svg, 'title', { id: 'cancha-titulo' }, 'Formación de los dos equipos');
  elementoSvg(svg, svg, 'desc', { id: 'cancha-descripcion' }, 'Cancha de fútbol con jugadores ubicados por posición. Equipo uno de blanco y equipo dos de rojo.');
  const verde = '#276d43', linea = '#f5fff6';
  elementoSvg(svg, svg, 'rect', { x: 12, y: 48, width: 776, height: 560, rx: 18, fill: verde });
  for (let i = 0; i < 8; i++) elementoSvg(svg, svg, 'rect', { x: 12 + i * 97, y: 48, width: 97, height: 560, fill: i % 2 ? '#ffffff' : '#0b4325', opacity: '.045' });
  const lineStyle = { fill: 'none', stroke: linea, 'stroke-width': 3, opacity: '.9' };
  elementoSvg(svg, svg, 'rect', { ...lineStyle, x: 25, y: 61, width: 750, height: 534, rx: 4 });
  elementoSvg(svg, svg, 'line', { x1: 400, y1: 61, x2: 400, y2: 595, stroke: linea, 'stroke-width': 3, opacity: '.9' });
  elementoSvg(svg, svg, 'circle', { ...lineStyle, cx: 400, cy: 328, r: 72 });
  elementoSvg(svg, svg, 'circle', { cx: 400, cy: 328, r: 4, fill: linea });
  elementoSvg(svg, svg, 'rect', { ...lineStyle, x: 25, y: 200, width: 94, height: 256 });
  elementoSvg(svg, svg, 'rect', { ...lineStyle, x: 25, y: 267, width: 38, height: 122 });
  elementoSvg(svg, svg, 'rect', { ...lineStyle, x: 681, y: 200, width: 94, height: 256 });
  elementoSvg(svg, svg, 'rect', { ...lineStyle, x: 737, y: 267, width: 38, height: 122 });
  elementoSvg(svg, svg, 'text', { x: 205, y: 33, 'text-anchor': 'middle', class: 'pitch-team-label pitch-white-label' }, 'EQUIPO 1 · BLANCO');
  elementoSvg(svg, svg, 'text', { x: 595, y: 33, 'text-anchor': 'middle', class: 'pitch-team-label pitch-red-label' }, 'EQUIPO 2 · ROJO');
  const columna = { ARQ: 62, DEF: 153, MED: 250, DEL: 354 };
  for (const [equipo, lado, tono] of [[r.equipo1, 0, 'white'], [r.equipo2, 1, 'red']]) {
    for (const pos of ['ARQ', 'DEF', 'MED', 'DEL']) {
      const jugadoresPos = equipo.filter(j => j.pos === pos);
      const paso = jugadoresPos.length > 1 ? Math.min(105, 340 / (jugadoresPos.length - 1)) : 0;
      jugadoresPos.forEach((j, i) => {
        const x = lado ? 800 - columna[pos] : columna[pos];
        const y = 328 + (i - (jugadoresPos.length - 1) / 2) * paso;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `pitch-player pitch-player-${tono}`);
        elementoSvg(svg, g, 'title', {}, `#${j.id} ${j.nombre}, ${pos}, media ${media(j)}`);
        elementoSvg(svg, g, 'circle', { cx: x, cy: y, r: 23, class: 'pitch-shirt' });
        elementoSvg(svg, g, 'text', { x, y: y + 6, 'text-anchor': 'middle', class: 'pitch-number' }, String(j.id));
        const nombre = j.nombre.length > 12 ? `${j.nombre.slice(0, 11)}…` : j.nombre;
        elementoSvg(svg, g, 'text', { x, y: y + 42, 'text-anchor': 'middle', class: 'pitch-name' }, nombre);
        elementoSvg(svg, g, 'text', { x, y: y + 57, 'text-anchor': 'middle', class: 'pitch-media' }, media(j));
        svg.append(g);
      });
    }
  }
  return svg;
}
function tarjeta(titulo, lista, total, clase = '') { const t = nodo('article', undefined, `team ${clase}`.trim()); t.append(nodo('h3', titulo)); if (total !== undefined) t.append(nodo('p', `${total.toFixed(2)} puntos`, 'score')); const ul = nodo('ul'); for (const j of lista) ul.append(nodo('li', `${posicionEnNombre(j) ? '' : `${j.pos} · `}#${j.id} ${j.nombre} · Media ${media(j)}`)); if (!lista.length) ul.append(nodo('li', 'Sin suplentes')); t.append(ul); return t; }
$('#generar').addEventListener('click', () => { limpiar(); try {
  if (pendientes) throw new Error('Aplicá los IDs manuales antes de generar.');
  if (!$('#seed').checkValidity()) throw new Error('La semilla debe ser un entero entre 0 y 4294967295.');
  const lista = base.filter(j => seleccionados.has(j.id)), c = Number($('#formato').value); validarSeleccion(lista,c);
  const r = armarEquipos(c, { convocados: lista, seed: Number($('#seed').value) });
  $('#resultado').append(nodo('p',`Diferencia ${r.diferencia.toFixed(2)} · Semilla ${r.seed} · ${r.generaciones} generaciones`,'result-summary'),cancha(r));
  if (r.suplentes.length) $('#resultado').append(tarjeta('Suplentes',r.suplentes));
  $('#panel-jugadores').hidden = true; $('#panel-resultado').hidden = false;
} catch(e) { error(e); } });
$('#editar-jugadores').addEventListener('click', limpiar);
$('#alta').addEventListener('submit', e => { e.preventDefault(); try {
  const form = e.currentTarget; if (!form.reportValidity()) return;
  const datos = new FormData(form), nombre = datos.get('nombre').trim(), pos = datos.get('pos'), habilidad = Number(datos.get('habilidad')), fisico = Number(datos.get('fisico'));
  if (!nombre || base.some(j => j.nombre.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) throw new Error('Ingresá un nombre único.');
  if (!['ARQ','DEF','MED','DEL'].includes(pos) || ![habilidad,fisico].every(n => Number.isFinite(n) && n >= 0 && n <= 10)) throw new Error('Posición o puntajes inválidos.');
  const id = Math.max(0,...base.map(j => j.id)) + 1; if (!Number.isSafeInteger(id)) throw new Error('No quedan IDs disponibles.');
  base.push({id,nombre,pos,habilidad,fisico}); if (seleccionados.size < 22) seleccionados.add(id); actualizar(); form.reset(); $('#alta-estado').textContent = `${nombre} agregado con ID ${id}. Guardá la base para conservarlo.`;
} catch(e) { error(e); } });
$('#guardar-base').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(base, null, 2) + '\n'], { type: 'application/json' }));
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'jugadores.json'; enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#alta-estado').textContent = 'Base descargada. Reemplazá jugadores.json en el proyecto y publicá el cambio para compartirla.';
});
actualizar(); cupos();

