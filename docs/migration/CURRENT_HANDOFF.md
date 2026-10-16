# ATRIA 5.0 — Transferencia de sesión, C02

Repositorio `javierdario48-star/ATRIA`; única rama de escritura
`atria-5.0-core-rebuild-experimental`.
Último SHA remoto comprobado antes de esta publicación documental:
`7dff1e82bb27f3e381c757c8f41f7fe3faf924aa`; CI [38841164329](https://github.com/javierdario48-star/ATRIA/actions/runs/38841164329)
completa success. Esta entrega C02 no cambia el ejecutable C01.

C02 completó matriz de sistemas y clasificación de 73 módulos de producción con
hashes. Leer `STEP_02_HANDOFF.md`, `PARITY_MATRIX.md`, inventario JSON y
`PHASE_A_IMPLEMENTATION.md`. La solicitud actual sustituye la prioridad anterior:
no añadir patologías. CIRR/APP son los únicos casos completos de validación.

La sesión sigue implementando Fase A; todavía no se publica ese ejecutable en este
checkpoint. Si se retoma únicamente desde C02, no asumir que existe código de examen
regional o monitor continuo hasta encontrarlo en un commit posterior y su informe.
No hay cambios esenciales necesarios para recuperar el ejecutable anterior.

Invariantes: mapa/sprites originales, teclado compacto de cuatro filas, cámara y
movimiento aprobados, ambo sin teletransporte, misma autoridad/puerto, relojes y
recibos/XP. No escribir main/producción/backend/credenciales/vendor ni ramas protegidas.
No importar HTML o wrappers históricos en V5.

Recuperación: clonar rama, comprobar HEAD/CI, leer STATUS y este informe. Ejecutar
`npm run test:v5`, `npm run build:v5`, `npm run build:v5-core`, `npm test`.
QA Chromium según `qa/v5/browser-harness.mjs`, sin necesidad de herramientas privadas.
Preview aprobada de C01 y limitaciones en STEP_01; no afirmar nueva prueba física Android.

Siguiente: C04 examen anatómico/Glasgow y C05.a interacción táctil/monitor/historia
sobre contratos documentados; UI real, positivos/negativos, regresiones CIRR/APP,
CI y preview exactos. Luego B comunicación/enfermería. Tutor/voz/red y guardia
continua siguen pendientes. Actualizar este archivo al finalizar la sesión.

Prompt: «Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, exclusivamente
`atria-5.0-core-rebuild-experimental`. Verifica HEAD/CI actuales y lee
`docs/migration/{STATUS,CURRENT_HANDOFF,STEP_02_HANDOFF,PARITY_MATRIX,PHASE_A_IMPLEMENTATION}.md`.
Retoma el último código publicado y sus pruebas sin reconstruir C01 ni añadir
casos. Implementa el siguiente sistema autorizado de Fase A por autoridad/puerto
existentes, valida UI móvil y regresión CIRR/APP/histórica, publica solo experimental
y deja informes autosuficientes con SHA, CI, preview y pendientes comprobados.»
