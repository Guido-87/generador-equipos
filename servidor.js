import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Lista explícita: el servidor local no expone archivos del proyecto ni rutas arbitrarias.
const archivos = new Map([
  ['/', ['index.html', 'text/html']],
  ...['index.html', 'styles.css', 'script.js', 'equipos.js', 'seleccion.js', 'jugadores.json', 'estadisticas.js', 'estadisticas-ui.js'].map(nombre =>
    [`/${nombre}`, [nombre, nombre.endsWith('.json') ? 'application/json' : nombre.endsWith('.css') ? 'text/css' : nombre.endsWith('.html') ? 'text/html' : 'text/javascript']])
]);
export function crearServidor() {
return http.createServer(async (req, res) => {
  let ruta;
  try { ruta = new URL(req.url, 'http://localhost').pathname; }
  catch { res.writeHead(400).end('Solicitud inválida'); return; }
  const archivo = archivos.get(ruta);
  if (!archivo || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404).end('No encontrado');
    return;
  }
  try {
    const contenido = await readFile(new URL(archivo[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': `${archivo[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : contenido);
  } catch {
    res.writeHead(500).end('No se pudo cargar el archivo');
  }
});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const servidor = crearServidor();
servidor.on('error', error => { console.error(`No se pudo iniciar: ${error.message}`); process.exitCode = 1; });
servidor.listen(3000, '127.0.0.1', () => console.log('Abrí http://127.0.0.1:3000 · Ctrl+C para salir'));
}
