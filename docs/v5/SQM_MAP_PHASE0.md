# ATRIA V5 — fase experimental de mapa por SQM

Rama: `atria-5.0-map-sqm-experimental`

## Objetivo
Reemplazar progresivamente el fondo hospitalario único por un escenario modular de casillas lógicas de 32×32 píxeles, sin tocar la rama de V5 ni modificar el motor clínico antes del control de calidad.

## Fuente verificada
- `src/v5/content/assets/hospital.webp`: 1024 × 1536.
- `src/v5/content/hospital.json`: navegación actual 32 × 53 (celdas rectangulares ~32 × 28,98).
- Cuadrícula destino: 32 × 48 (1.536 SQM de 32×32).
- Ocho camas operativas en `beds.json`; la imagen fija y los marcadores heredados no son una lista limpia de objetos.

## Principio de migración
1. Guardar el recorte de cada uno de los 1.536 SQM del bitmap original para auditoría. Un recorte de una zona con muebles no es un tile de piso.
2. Conservar versión escalada 128×128 solamente para inspección (interpolación; no agrega detalle real).
3. Definir un número reducido de pisos neutros reutilizables. Las zonas cubiertas por objetos usan material neutro sin iluminación horneada.
4. Guardar por SQM una clasificación: piso probable, revisión, cubierto. Las clasificaciones automáticas requieren verificación visual.
5. Registrar estimaciones de iluminación separadas de material, con estado "aproximado". Las luces finales dependerán de lámparas y muros cuando existan como objetos reales.
6. No migrar las colisiones actuales 32×53 por simple redimensionado; rediseñarlas en 32×48 con geometría del nuevo escenario.

## Contratos de preservación
- No modificar ni reemplazar archivos de arte, navegación, cámara, pacientes, enfermería, estados clínicos, cierres, XP o modos de juego de V5 mientras el nuevo render no haya pasado QA.
- La información de suelo bajo una cama, planta o pared no puede recuperarse exactamente de `hospital.webp` porque fue horneada en el bitmap original.
- Comparar vistas del viejo y nuevo escenario a idéntica escala; revisar las transiciones y probar 2–4 médicos antes de cualquier reemplazo.
- Los objetos serán entidades únicas con sprites rotables, footprint, colisión y puntos de interacción.

## Herramientas de preparación
El paquete `ATRIA_SQM_KIT_EXPERIMENTAL.zip` generado en el chat contiene un laboratorio visual HTML y un extractor reproducible en Python. El paquete no se ha subido a esta rama todavía: queda separado para inspección antes de incorporarlo.

## Fase siguiente
Tras aprobar el material base y la clasificación, empezar por paredes, puertas y luminarias; después camas, monitores y demás objetos. La iluminación físicamente coherente se calibra tras colocar paredes y lámparas.
