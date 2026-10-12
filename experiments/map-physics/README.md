# ATRIA — mapa separado y posiciones físicas

**Rama experimental exclusiva:** `experiments/atria-physical-map-layout-20261011`. **Sin cambios** al runtime de `atria-4.8.7-qa`, `main`, al golden master ni a producción.

- `original-navigation-map.json`: copia exacta del objeto `MAP` del HTML golden master. Conserva las 32×53 celdas, sus puertas, 18 interacciones y posiciones de entrada.
- `floor-clean.svg`: piso nuevo de 1024×1536 sin obstáculos, paredes, pacientes ni muebles. Se conserva el sistema de coordenadas; NO se trata de una restauración fotográfica de pisos ocultos por muebles.
- `placements-preview.svg`: capa visual indicativa de los 8 anclajes de cama B1–B8, monitores V413 y aproximaciones V39.
- `physics-layout.json`: definición de 8 camas/8 monitores con coordenadas exactas e identificadores clínicos; colisionadores propuestos todavía inactivos.
- `export-original-background.mjs`: script local para extraer literalmente la imagen original raster de `BG_SRC` del archivo `vendor/atria-4.8.6/index.html` sin editar la fuente.
- `verify-layout.mjs`: comprobación de que las coordenadas clínicas coinciden con el código actual de referencia.

**Condiciones de migración:** conservar los identificadores `B1` a `B8`, sus anclajes `patient`, los `screens` V413 de monitor, las ocho `approach` V39 y las categorías `critical/monitored/standard`. Mantener asignación y propiedad multiplayer, monitor de paciente vacío/ocupado, clicks en pantalla y en móvil, navegación A*, NPC y enfermería. Medir los colliders con los nuevos sprites antes de activarlos.

**Detalle importante:** `MAP.interactions` incluye `bed_09` en la casilla [27,12] como hotspot original sin par clínico en `V39_BEDS`. No convertirlo en B9 en esta migración. La matriz original contiene 18 interacciones, nueve de tipo `hospital_bed`; el registro clínico válido contiene ocho camas.

El fondo original aún mezcla artísticamente muebles/paredes/piso en una sola imagen. Un piso "limpio" exacto a nivel de píxeles ocultos requiere reconstrucción visual, no se puede obtener simplemente eliminando una capa existente.

Comprobación local: `node experiments/map-physics/verify-layout.mjs`.
