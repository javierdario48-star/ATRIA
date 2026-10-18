# C5.b — continuidad clínica durable (implementación en checkpoints)

Base verificada: `980eeca10596ae678164e0a698c46922bd6cd874`. El manual maestro sigue siendo el contrato clínico. No se añaden casos ni se activa Competitivo.

## C5.b.1: estado operacional y autoridad transaccional

Implementado: `createGuardSession` y `createWorld` exportan y restauran datos versionados; no se reconstruyen administraciones a partir de botones, texto o un snapshot visual. Los propietarios existentes conservan estas responsabilidades:

| Propietario | Datos recuperados |
|---|---|
| GuardSession | Paciente completo: fisiología, enfermedad, exposición, supervivencia, complicaciones, historia, examen, Glasgow, diagnóstico, monitor, accesos, estudios y cierre; vínculos de estudios repetidos, trabajos de enfermería y órdenes que esperan una vía |
| GuardClock | Microsegundos, resto de redondeo, cuantos nativos, segmentos de ritmo, offsets y épocas selladas |
| Ejecutor compartido / CIRR | Preparaciones IV, órdenes asociadas y cambios/suspensión de noradrenalina; preparaciones originales de CIRR; consultas pendientes y sus respuestas |
| Puerto nativo | Huellas de órdenes, recibos, confirmaciones terminales y cuarentenas por ejecución no confirmada |
| Autoridad de sala | Integrantes, propiedad, revisión, transcript, eventos, deduplicación, vínculos de ejecuciones pendientes, complicaciones anunciadas y destinos publicados |
| World / enfermería física | Actores, caminos, posiciones, tareas, llegadas aún no consumidas, enfermera asignada, cola de reintento e interacción pendiente |
| Runtime | Hash SHA-256 del contenido, versión del modelo, tiempo observado, fracción aún no simulada, ritmo de teclado con vencimiento, comprobantes XP por integrante y confirmaciones de entrega |

`guard-runtime.js` compone **los mismos** `createWorld` y `createGuardSession` de Solitario. No contiene cálculos médicos ni temporizadores. La recuperación avanza el reloj y la enfermería existentes en pasos de 1/60 s; conserva el desfase con cuantos enteros (60 por milisegundo,1000 por paso), evitando deriva al sumar fracciones a timestamps de época; limita el trabajo por solicitud y conserva el tiempo todavía no procesado. Ninguna orden nueva se admite hasta terminar la recuperación. El ritmo nativo del anfitrión al escribir tiene vencimiento: una pestaña desaparecida no puede dejar un ritmo lento permanente.

`durable-guard-authority.js` exige `read(id)` consistente y `compareAndSwap(id,etag,value)` atómico. Adquiere una concesión durable con propietario y época creciente, restaura la sesión, calcula en privado y confirma **todo el agregado** antes de emitir ACK o estado. Una concesión vencida o un ETag sustituido impiden publicar al trabajador anterior. Los recibos y las colas se confirman en la misma operación; reintentar el mismo evento no administra otra dosis. El cierre genera un comprobante por integrante incluso cuando está desconectado; la entrega posterior no vuelve a generarlo.

`api/clinical.js` ofrece el transporte de esta autoridad, separado de las rutas sociales existentes. La creación verifica la invitación Cooperativa aceptada y la identidad del anfitrión en el backend social existente. La recuperación verifica el secreto del dispositivo existente y la membresía guardada; no depende de que la caché social conserve una sesión. El cliente no elige actor, integrantes ni época. No se exponen secretos en las respuestas.

## Persistencia y activación

El proyecto tiene `BLOB_READ_WRITE_TOKEN`, pero su mera presencia **no certifica** acceso privado, consistencia ni CAS. El adaptador exige Vercel Blob privado, `get(...,{access:'private',useCache:false})`, caminos estables y `put` con `ifMatch`. Las fallas no habilitan almacenamiento público, caché o memoria. El endpoint de capacidad comprueba escritura, lectura consistente y rechazo del ETag anterior usando únicamente datos de prueba sin información clínica.

Referencia primaria: https://vercel.com/docs/vercel-blob/using-blob-sdk y https://vercel.com/changelog/vercel-blob-now-supports-consistent-reads-on-private-storage. SDK fijado: `@vercel/blob@2.8.2`, con lockfile. El almacén privado debe estar accesible para la función antes de activar la ruta nueva en la interfaz.

`qa/v5/sqlite-guard-store.mjs` usa SQLite/WAL en disco y CAS transaccional. Permite probar recuperación y concurrencia real; **no es persistencia de producción en Vercel**, cuyo disco es efímero. Tampoco se presenta `getCache`, sessionStorage ni localStorage como el almacén durable de la guardia.

## Evidencia y límites de este checkpoint

Pruebas locales nuevas: restauración repetida de los cinco casos con enfermería real, preparaciones, estudios repetidos y consultas; rechazo de versiones/identidades/reloj incompatibles; cancelación de consulta pendiente al fallecer; reapertura de SQLite; dos órdenes simultáneas; trabajador viejo suspendido y rechazado tras nueva época; recuperación acotada sin pérdida de tiempo; abandono y muerte única; cierre con colega desconectado y XP por médico único tras tres recargas; contrato de Blob privado y transporte autenticado.

Defecto reproducido y corregido: al fallecer durante una consulta pendiente se cancelaba el planificador, pero el ACK de esa consulta quedaba pendiente. La muerte ahora termina todos los vínculos nativos pendientes en la misma autoridad. Otro test reprodujo un paso perdido tras480 s al usar timestamps de época reales; el acumulador entero recupera exactamente28.800 pasos sin multiplicar el reloj clínico.

**Todavía no se declara terminado C5.b:** en C5.b.1 la interfaz pública continúa usando la ruta C5.a del anfitrión. Faltan la conexión de las réplicas a esta autoridad durable, prueba de capacidad real en el despliegue y recuperación clínica desde dos, tres y cuatro navegadores. Las pruebas históricas C5.a siguen completas. No afirmar migración del anfitrión, continuidad WAN o persistencia clínica de producción basándose sólo en pruebas de SQLite o en que la API existe.

Siguiente checkpoint: comprobar el endpoint privado del despliegue; integrar las réplicas existentes con commit antes de ACK, recuperación del anfitrión y entrega de resultado sin anfitrión; conservar WebRTC/movimiento y un único transcript; ampliar los escenarios públicos 2→3→4. Si Blob es público o no ofrece la capacidad verificada, mantener la activación cerrada y documentar la dependencia exacta de almacenamiento privado transaccional.
