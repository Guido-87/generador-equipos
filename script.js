import { armarEquipos, jugadores, puntaje, FORMACIONES } from './equipos.js';
import { seleccionarPorIds, validarSeleccion } from './seleccion.js';
const $ = s => document.querySelector(s);
let base = jugadores.map(j => ({ ...j }));
const seleccionados = new Set(base.slice(0, 22).map(j => j.id));
let pendientes = false;
// Media visual truncada; el algoritmo conserva el puntaje original.
function media(j) { return String(Math.min(99, Math.floor(puntaje(j) * 10 + 1e-9))).padStart(2, '0'); }
function nodo(tag, texto, clase) { const n = document.createElement(tag); if (texto !== undefined) n.textContent = texto; if (clase) n.className = clase; return n; }
function limpiar() { $('#error').hidden = true; $('#resultado').replaceChildren(); }
function error(e) { $('#error').textContent = e.message; $('#error').hidden = false; $('#error').focus(); }
function actualizar() {
  $('#ids').value = [...seleccionados].sort((a,b) => a-b).join(' '); pendientes = false;
  $('#contador').textContent = `${seleccionados.size} seleccionados de ${base.length}`;
  $('#jugadores').replaceChildren();
  for (const j of base) {
    const label = nodo('label', undefined, 'player'), check = document.createElement('input'), datos = nodo('span');
    check.type = 'checkbox'; check.checked = seleccionados.has(j.id);
    datos.append(nodo('strong', `#${j.id} ${j.nombre}`), nodo('small', `${j.pos} · Media ${media(j)}`));
    check.addEventListener('change', () => {
      if (check.checked && seleccionados.size >= 22) { check.checked = false; error(new Error('Podés seleccionar como máximo 22 jugadores.')); return; }
      if (check.checked) seleccionados.add(j.id); else seleccionados.delete(j.id);
      // Conservar foco al actualizar la selección.
      $('#ids').value = [...seleccionados].sort((a,b) => a-b).join(' '); pendientes = false;
      $('#contador').textContent = `${seleccionados.size} seleccionados de ${base.length}`; limpiar();
    });
    label.append(check, datos); $('#jugadores').append(label);
  }
  limpiar();
}
function cupos() { const c = Number($('#formato').value); $('#cupos').textContent = `${c*2} titulares. Por equipo: ${Object.entries(FORMACIONES[`F${c}`]).map(([p,n]) => `${n} ${p}`).join(' · ')}.`; limpiar(); }
$('#ids').addEventListener('input', () => { pendientes = true; limpiar(); });
$('#aplicar').addEventListener('click', () => { try { const lista = seleccionarPorIds($('#ids').value, base); if (lista.length > 22) throw new Error('Podés seleccionar como máximo 22 jugadores.'); seleccionados.clear(); lista.forEach(j => seleccionados.add(j.id)); actualizar(); } catch(e) { error(e); } });
$('#todos').addEventListener('click', () => { if (base.length > 22) { error(new Error('Hay más de 22 jugadores. Elegí hasta 22 por casilleros o IDs.')); return; } seleccionados.clear(); base.forEach(j => seleccionados.add(j.id)); actualizar(); });
$('#ninguno').addEventListener('click', () => { seleccionados.clear(); actualizar(); });
$('#formato').addEventListener('change', cupos); $('#seed').addEventListener('input', limpiar);
function tarjeta(titulo, lista, total) { const t = nodo('article', undefined, 'team'); t.append(nodo('h3', titulo)); if (total !== undefined) t.append(nodo('p', `${total.toFixed(2)} puntos`, 'score')); const ul = nodo('ul'); for (const j of lista) ul.append(nodo('li', `${j.pos} · #${j.id} ${j.nombre} · Media ${media(j)}`)); if (!lista.length) ul.append(nodo('li', 'Sin suplentes')); t.append(ul); return t; }
$('#generar').addEventListener('click', () => { limpiar(); try {
  if (pendientes) throw new Error('Aplicá los IDs manuales antes de generar.');
  if (!$('#seed').checkValidity()) throw new Error('La semilla debe ser un entero entre 0 y 4294967295.');
  const lista = base.filter(j => seleccionados.has(j.id)), c = Number($('#formato').value); validarSeleccion(lista,c);
  const r = armarEquipos(c, { convocados: lista, seed: Number($('#seed').value) }); const grid = nodo('div',undefined,'teams');
  grid.append(tarjeta('Equipo 1',r.equipo1,r.total1),tarjeta('Equipo 2',r.equipo2,r.total2));
  $('#resultado').append(nodo('h2','Listos para jugar'),nodo('p',`Diferencia: ${r.diferencia.toFixed(2)} puntos · Semilla ${r.seed} · ${r.generaciones} generaciones`),grid,tarjeta('Suplentes',r.suplentes));
} catch(e) { error(e); } });
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

