# ATRIA — Checkpoint editor visual de objetos (experimental)

Fecha: 2026-10-12. Rama exclusiva: `test-mapa-migracion`. No actualizar main, QA, producción, Supabase ni golden master.

## Recuperación
- HEAD inicial verificado: `10e953eb851c93c68787bafdb81d33ae1177ee4b`, CI verde (workflow `Test mapa plantas - colisiones v3`).
- El visor `test-mapa-migracion/index.html` es independiente. Fondo 1024×1536 y jugador WebP incrustados. No se modifica `vendor/atria-4.8.6/index.html`.
- Diagnóstico: el renderizador legado recortaba y recomponía el propio fondo original mediante máscaras elípticas/rectangulares, que dejan ver arquitectura en los fragmentos de oclusión. Las guías amarillas son depuración independiente.

## Corrección en curso
- `object-editor.js`: editor táctil aislado; capas alfa independientes de silueta, follaje y oclusión; fuentes RGB extraídas únicamente de `sceneImg`; borrador/agregar, dureza, zoom/pinch, comparación original/corregido, deshacer/rehacer, máscara por instancia, colisión posterior asimétrica editable y profundidad basada en pies.
- Sustituye la recomposición rectangular del renderizador anterior por `drawImage` de sprites RGBA con alfa por píxel; las guías de editor se dibujan por separado.
- El fondo original permanece intacto.
- JSON guarda matrices alfa sin pérdida, colliders, anclas, estado QA y plantillas físicas. ZIP de editor permite exportar configuración y PNG originales seleccionados.
- Empaquetado offline autocontenido por `bundle_object_editor.py`; **NO** depende de CDN.
- P31: bbox (288,905,68,115); se preserva recorte RGB original; inicialización de máscara con polígonos y semillas de verde, maceta separada. Se conserva geometría de centro (322,988), radios (13,7), rearLift=6, rearExtraY=5, frontExtraY=0. **Continúa candidata, no aprobada visualmente**.

## Bloqueadores y alcance honesto
- **Recuperada P47 de la fuente previa `plants_physics.json` del usuario:** recorte (961,1270,56,90), centro (989,1312), ancla profundidad (989,1342), collider centro (989,1336.8). El manifiesto contiene ahora 47 candidatos P01–P47; máscara de P47 sigue pendiente de aprobación individual. No se han inventado coordenadas ni se ha integrado el PNG binario previo.
- Extracciones genéricas que se inicialicen para P01–P46 son solo candidatos no aprobados. No afirmar eliminación perfecta de halos o paredes sin inspección visual.
- Una ejecución verde de Node/browser prueba funcionamiento mecánico, no aprobación óptica de P31.
- Sin prueba física real de Android aún; las pruebas simuladas 390×760 no sustituyen el móvil del usuario.

## Pasos de QA
1. `node --check test-mapa-migracion/plants/object-editor.js`.
2. `python test-mapa-migracion/plants/pilot_P31.py` para archivo fuente exacto y placa QA.
3. `python test-mapa-migracion/plants/bundle_object_editor.py` para empaquetar HTML único y ZIP con inventario fuente P01–P47.
4. Prueba navegador móvil simulada: editor, pincel, colisión posterior, guardar/importar JSON, ZIP y errores JS.
5. En Android físico: P31 arriba/abajo/izquierda/derecha y alfa sobre negro, blanco, gris, cuadriculado y mapa. Aprobar solo si se confirma visualmente.

## QA automatizada
- Workflow experimental para editor: prueba JavaScript, exportación/importación exacta, colisión, profundidad, ZIP y emulación de Android. Validar siempre el HEAD actual tras cambios.
- Los experimentos de física y sprites no se promueven a ATRIA producción.

## Próximo paso
Corregir problemas detectados por navegador, conservar checkpoints pequeños y emitir paquete de Actions descargable. No migrar camas ni paredes hasta aprobación de P31 y del flujo de editor.
