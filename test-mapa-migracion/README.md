# ATRIA — Test Mapa Migración (aislado)

**Estado:** prueba experimental de profundidad en el hospital completo. Sin integración clínica ni sustitución de renderer en el juego principal. Base `atria-4.8.7-qa` en `7b571a37ded0d3c1ed53923cb95c525ed977fcb4`.

## Iniciar la prueba

Descargar `index.html` y abrirlo en navegador moderno (el HTML contiene imagen WebP original, sprite original del jugador, mapa y coordenadas, sin CDN ni servidor). La prueba se ejecuta también sin internet.

## Alcance

- Fondo real del hospital de **1024 × 1536 píxeles**, matriz original de **32 × 53** casillas, puertas y navegación A*.
- Sprite original de personaje, clic/tap para caminar, WASD/flechas y controles móviles.
- Profundidad opcional en ON/OFF: cuando el personaje está detrás de una máscara, se vuelve a dibujar exclusivamente la región del objeto original sobre él. No requiere todavía recortar PNG con fondo transparente.
- Primera cobertura aproximada: **45 máscaras de plantas + 3 de mostradores**. Son estimaciones visuales ajustables, NO segmentación final pixel-perfect.
- Botones **Mostrar máscaras**, **Ajustar máscaras**, **Agregar máscara**, **Eliminar seleccionada**, **Exportar JSON**, **Importar JSON**, zoom y vista completa.
- Registro de **8 camas clínicas B1–B8** y 8 monitores V413 sin cambiar coordenadas; tocar monitor muestra confirmación simulada, NO abre un caso real.
- Las colisiones iniciales usan la matriz original, no colisionadores independientes ni motor OTClient. No se copia código propietario de Tibia ni se migra la clínica.

## Archivo que el usuario debe devolver

`ATRIA_test_mapa_migracion_mascaras.json` exportado después de ajustar la posición de las máscaras.

## Inventario propuesto de sprites reutilizables (19 originales como objetivo de arte, no obligatorios para esta primera prueba)

| Categoría | Diseños | Nota |
| --- | ---: | --- |
| Plantas/macetas | 3 | La más importante para profundidad |
| Cama | 1 | Repetida 8 veces |
| Monitor | 1 | Repetido 8 veces |
| Soportes IV/bombas | 2 | Reutilizables |
| Mesas auxiliares | 2 | Variantes |
| Sillas/taburetes | 2 | Variantes |
| Sofás/espera | 2 | Variantes |
| Escritorios/mostradores | 2 | Uno central y otros reutilizables |
| Armarios/estantes | 2 | Variantes |
| Carro médico | 1 | Reutilizable |
| Cortinas/biombos | 1 | Variante |
| **Total** | **19** | Plan visual preliminar |

El tomógrafo, la mesa quirúrgica, puertas y paredes continúan en el fondo inicialmente; se migran a objetos solo si se necesitan interacciones, movimiento u oclusión particulares.

## Garantías

- La rama `test-mapa-migracion` es independiente.
- No editar `main`, `atria-4.8.7-qa`, `vendor/atria-4.8.6`, producción ni Supabase.
- Nunca convertir el hotspot de dibujo `bed_09` en una cama clínica B9.
- La simulación clínica, enfermería, progresión y multijugador no se ejecutan en esta prueba.
- Antes de fusionar cualquier cambio visual al juego principal se requieren pruebas en Android/iPhone de colisión, oclusión y todos los ocho puntos de atención.
