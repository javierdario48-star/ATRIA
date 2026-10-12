# Planta P31 — checkpoint de extracción supervisada

Estado: **PENDIENTE DE APROBACIÓN VISUAL (no promover a producción)**.

- Fuente: `vendor/atria-4.8.6/index.html` → `BG_SRC`, escenario 1024×1536.
- Ubicación exacta del recorte: **x=288, y=905, ancho=68, alto=115**.
- Huella alfa local aproximada: **[13,22,56,92]**.
- Píxeles RGB: conservados de la fuente; solo se define máscara alfa, sin generar ni rediseñar hojas.
- Método disponible y usado: inspección ampliada y supervisada, contornos manuales, semillas de color HSV y refinamiento OpenCV de alfa. **SAM 2/3 no estaba instalado en la ejecución local**.
- Reglas provisionales: ancla (322,995); maceta sólida elipse con centro (322,988), radio 13×7 px; hojas transitables, con oclusión y depth sorting según Y de los pies.
- Un único candidato P31. Ninguna de las otras detecciones P01–P46 se considera aprobada o reutilizable automáticamente.
- Limitación: hojas en contacto con la pared oscura izquierda, contorno potencialmente ambiguo; es obligatoria revisión del PNG frente a fondos claros y oscuros y en el mapa.
- Pruebas del sandbox local independiente: personaje puede pasar detrás del follaje, no atraviesa maceta, puede pasar por el lateral y se produce diferencia visible al activar la oclusión. Navegador Chromium emulando viewport móvil 390×760 sin errores JS. **No se realizó prueba en un móvil Android físico**.
- El sandbox local descargable incorpora el fondo entero sin modificación y los sprites del piloto; no está integrado en el runtime de ATRIA.

## Regeneración y artefactos

- Ejecutar: `python test-mapa-migracion/plants/pilot_P31.py`.
- [Workflow independiente](../../.github/workflows/test-map-P31.yml): `Test mapa P31 - extraccion supervisada` con pruebas de tamaño y RGB. Sus artifacts incluyen el PNG, follaje, alfa, metadatos y validación.
- CI verde solo acredita ejecución técnica, no separación semántica satisfactoria.
- Última ejecución validada: https://github.com/javierdario48-star/ATRIA/actions/runs/38198107197.
- Las máscaras y metadatos clínicos de las camas B1-B8 no se han modificado; este checkpoint es independiente.

## Siguiente decisión

La siguiente fase exige aprobación visual de P31; de ser necesario, refinar solo la máscara antes de intentar nuevas plantas. Sin ella, no integrar en el mapa del juego ni declarar finalizada la extracción.
