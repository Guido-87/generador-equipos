# Generador de equipos

Interfaz vanilla sin frameworks; las estadísticas compartidas usan la biblioteca oficial @netlify/blobs. Requiere Node.js 22.12 o posterior y un navegador actual con módulos e importaciones JSON.

## Abrir la interfaz

```sh
npm run web
```

Abrí http://127.0.0.1:3000. El servidor sólo escucha en tu computadora. Abrir index.html directamente como archivo no permite cargar los módulos correctamente.

Elegí F5, F7, F9 o F11. Marcá jugadores o ingresá IDs separados por espacios, comas o punto y coma y aplicá la selección. Se admiten entre 10 y 22 convocados, suficientes para dos equipos y los cupos de cada posición. Los convocados adicionales aparecen como suplentes. Los primeros diez IDs pueden no alcanzar los cupos de posiciones.

La base inicial tiene 18 jugadores. F11 requiere 22: dos arqueros, ocho defensores, ocho mediocampistas y cuatro delanteros. Para completar la base actual, agregá dos defensores y dos mediocampistas con sus datos reales. Las altas visuales duran durante la sesión. Usá Exportar base JSON y reemplazá jugadores.json del proyecto con el archivo descargado para conservarlas; luego recargá.

## Archivos y decisiones

- jugadores.json: única base, con IDs explícitos desde 1. Al agregar usá un ID nuevo mayor al máximo histórico; no renumeres ni reutilices IDs al borrar jugadores. Se conserva este nombre en lugar de duplicarlo como db.json.
- equipos.js: algoritmo genético y validaciones. Conserva la API y listas antiguas sin IDs; los IDs presentes deben ser enteros positivos únicos.
- seleccion.js: resolución estricta de IDs y validación visual de 10 a 22 convocados.
- index.html, styles.css y script.js: interfaz y eventos. Los nombres se insertan como texto, sin interpretar HTML.
- servidor.js: servidor local con lista explícita de archivos públicos.
- equipos.original.js: referencia original conservada.

El generador funciona en el navegador; la escritura de estadísticas usa Netlify Functions y Blobs. La ruta /mnt/data/equipos.js no estaba disponible: se trabajó sobre equipos.js existente en este proyecto.

## Algoritmo

Población de 100, hasta 200 generaciones, cruce uniforme, mutación de 0.10 y elitismo del 20%. La reparación conserva posiciones obligatorias. Puntaje: habilidad * 0.7 + fisico * 0.3, sin redondear durante la búsqueda.

La misma semilla y lista en el mismo orden reproducen el resultado. Se busca equilibrio, sin garantía del óptimo general ni maximización de la fuerza de titulares o rotación de suplentes. optimoGarantizado sólo indica diferencia cero dentro de tolerancia numérica. No se modifican las entradas. El límite de 22 es de la selección visual; la API genética admite planteles mayores.

## Consola y pruebas

```sh
npm start
npm start -- 7 42
npm test
```

La consola conserva cantidad por equipo y semilla como argumentos; usa toda la base. Las pruebas cubren formaciones, suplentes, semillas, duplicados, preservación de entradas e IDs, selección manual, entradas inválidas, límites y F11 con jugadores adicionales. Un oráculo exhaustivo independiente contrasta el resultado F9 de referencia, sólo en pruebas.

Coordinación: Jesse (interfaz), Jona (lógica/datos), Juli (QA), con seguridad de Enzo y arquitectura de Rucau como responsabilidades de revisión del equipo.


## Verificación completa

Ejecutá npm run verify para comprobar sintaxis, pruebas unitarias e integración HTTP con cobertura mínima de líneas del 80% en lógica y servidor. El código de eventos del navegador queda fuera de esa cifra. Plan, decisiones y resultados en REVISION.md.

## Netlify

Conectá el repositorio de GitHub a Netlify usando main como rama de producción. netlify.toml configura Node 24, ejecuta npm run verify y npm run build, y publica únicamente dist. Cada push a main dispara un despliegue; si fallan las pruebas no se publica esa versión. Las altas siguen siendo de sesión: exportar JSON no modifica la base desplegada.


## Estadísticas compartidas

El botón Agregar estadística abre un modal con jugador, goles, asistencias, participaciones calculadas (goles + asistencias) y MVP. La disponibilidad se consulta al servidor: sábado desde las 17:00, domingo y lunes hasta las 23:59:59, en America/Argentina/Buenos_Aires. Tanto abrir como guardar respetan la ventana; el servidor vuelve a validar al persistir.

Se usa Netlify Functions y Netlify Blobs (dependencia @netlify/blobs). Los datos permanecen entre despliegues y se comparten entre dispositivos. Un registro por jugador permanente y jornada semanal, sin sobrescritura; se utiliza escritura condicional para evitar duplicados concurrentes. Las altas de jugadores de sesión no forman parte de esta base compartida. Las jornadas previas se conservan en el almacén, aunque la tabla muestra la jornada actual.

La carga es pública durante la ventana: no hay autenticación y cualquiera puede registrar estadísticas de un jugador. El horario no identifica quién carga. Los registros no modifican la media ni el algoritmo genético.

La interfaz permite actualizar la tabla y permanece disponible para lectura fuera de horario. La API GET /api/estadisticas devuelve reloj, jornada, habilitación y registros; POST valida IDs, contadores enteros 0–100 y MVP booleano. Se rechazan origen cruzado, JSON inválido y cuerpos mayores a 2 KiB. El reloj del navegador no autoriza escrituras.

npm run web sirve sólo la parte estática local; la función compartida corre en Netlify. Para desarrollo completo se puede usar Netlify Dev con el proyecto vinculado. Las pruebas de API usan un almacén simulado y no escriben estadísticas reales. Suite ampliada: 24 pruebas; cobertura de lógica/API/servidor 98,03% de líneas (no incluye los eventos DOM ni el servicio externo de Netlify).
