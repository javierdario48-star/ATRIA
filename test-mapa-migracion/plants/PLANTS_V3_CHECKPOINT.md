# Checkpoint — Test Mapa Migración / Plantas v3 (aislado)

## Alcance y fuente
- Imagen original inmutable: `vendor/atria-4.8.6/index.html`, constante `BG_SRC`, 1024 × 1536.
- Inventario: 46 candidatos originales y una planta cilíndrica independiente separada del recorte P44 → **47 instancias**.
- Assets experimentales preparados en una carpeta exportable como PNG RGBA nativos, par `Pxx.png` + `Pxx_foliage.png`, más `plants_physics.json` y contacto QA.
- No se crearon ilustraciones nuevas. Los canales RGB proceden del mapa original. El alfa está segmentado y es todavía provisional.
- **18 instancias presentan advertencias** por contacto con arquitectura, mobiliario, luz, o variantes atípicas. No declarar aprobados los 47 recortes ni usarlos automáticamente en producción.
- Extractor aún en fase de calibración; la entrega binaria de revisión del usuario está en el paquete adjunto a este chat. La rama contiene el inventario fuente, el piloto P31 y este contrato, NO el contenido binario de los 47 nuevos PNG.
- Clasificación de variantes idénticas NO confirmada: una aparición no se reutiliza indiscriminadamente en otra posición.

## Física nueva (reutilizable)
`asymmetric-plant-collider.mjs` es la referencia:
- La base de la maceta bloquea paso con radio del personaje incluido.
- Semielipse posterior con centro elevado + expansión exclusiva en Y.
- Semielipse anterior mantiene su borde original.
- Follaje no bloquea físicamente y actúa como oclusor alfa delante del personaje si sus pies pasan detrás del ancla.
- Cada objeto conserva su ancla, su bounding box y colores originales.
- El fondo de ATRIA queda intacto.

P31: centro de colisión (322,988), radios (13,7), personaje 7, elevación posterior 6, expansión posterior 5, expansión frontal 0.  El resto escala con el tamaño de maceta inferido, sujeto a QA.

## Pruebas ejecutadas
- Vista móvil simulada en Chromium 390×760: carga offline de 47 sprites, movimiento, botones y selección P12/P31/P43/P44/P47, profundidad ON/OFF; cero errores JS.
- P31: colisión posterior aumentada, borde frontal sin expansión y paso lateral comprobados.
- Se verificó que los RGB de cada PNG RGBA son iguales a los RGB de su recorte original.
- No es una prueba en Android físico.
- La coincidencia RGB no demuestra una máscara correcta; revisar cada imagen de QA antes de integrar.
- No se tocó `atria-4.8.7-qa`, `main`, el golden master ni el multijugador.

## Próximo checkpoint
Aprobar siluetas con objetos ocluidos; luego comenzar **camas y paredes**, únicamente después de confirmar los cambios visuales.
