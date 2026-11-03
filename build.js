import { mkdir, copyFile } from 'node:fs/promises';

// Sólo estos archivos forman parte del sitio publicado.
const publicos = ['index.html', 'styles.css', 'script.js', 'equipos.js', 'seleccion.js', 'jugadores.json', 'estadisticas.js', 'estadisticas-ui.js'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const nombre of publicos) {
  await copyFile(new URL(nombre, import.meta.url), new URL(`dist/${nombre}`, import.meta.url));
}
console.log(`Sitio preparado en dist: ${publicos.length} archivos públicos.`);
