# ATRIA 4.8.7 QA — Impresión diagnóstica y alta de nuevas patologías

## Contrato universal implementado

- `src/clinical/diagnostic-impression-487.js`: vocabulario global, búsqueda tolerante a acentos, clasificación de impresión incompleta y equivalencias. No recibe la patología activa para sugerir; nunca debe revelar la respuesta por filtrado.
- `src/integration/diagnostic-autocomplete-487.js`: cuadro luminoso sobre paciente, editor con autocompletado al escribir, guardado/borrado, visualización abreviada, teclado móvil, selección con botón y lectura sin edición cuando el paciente pertenece al rival. Oculto en lobby, selector o atención finalizada.
- Fuente única: `sim.diagnosis`, la misma que utilizan `/dx`, la ficha clínica, el evaluador y la puntuación existente. No crear otro registro paralelo.
- Una impresión vaga, como «peritonitis», sigue editable pero no habilita una derivación como diagnóstico específico. La lista incluye las variantes de todos los casos y nunca se limita al paciente actual.
- El evaluador de los 3 casos de peritonitis admite también `window.csDx487.matchesCase(id,text)`, sin perder sus validaciones clínicas anteriores; clínicamente equivalente no significa necesariamente tratamiento o traslado habilitados.

## Checklist obligatorio para cada nuevo caso

1. Incorporar la semilla al catálogo `CASES` existente con identificador estable `id`, diagnósticos válidos `dx` (nombre clínico suficientemente específico + sinónimos), síntomas, anamnesis, examen y signos.
2. Cargar estudios, resultados, tratamientos y fisiología. No convertir en requisito resultados de cultivos tardíos para derivaciones urgentes.
3. Especificar evidencias suficientes, terapéutica confirmada, derivaciones y criterios de gravedad en su evaluador clínico. El autocompletado **no sustituye** esas reglas de seguridad.
4. Cuando proceda, agregar `diagnosticTerms` para sugerencias de redacción y `diagnosticAliases` para equivalencias a considerar en `csDxMatchesCase487`. Evitar registrar descripciones vagas como diagnóstico suficiente.
5. Probar diagnóstico correcto, equivalente, incompleto, erróneo, ausencia de diagnóstico; órdenes de estudios/medicación pendientes versus realizadas; interconsultas pendientes versus aceptadas; destino correcto/incorrecto; muerte y multijugador; respuesta fisiológica y XP.
6. Ejecutar `npm test`, `npm run build`, CI y preview QA. Probar presencialmente el teclado Android/iPhone, posición del cuadro, cambio de pacientes y permisos de modificación.

## Límites explícitos del alcance

Este checkpoint implementa el **cuadro y su motor global de autocompletado**, no reconstruye el sistema de interconsultas ni el de destinos. La respuesta automática de cirugía contextual con aceptación/rechazo y la sustitución del botón que revela directamente el destino son mejoras separadas, todavía pendientes; no se deben presentar como implementadas. La interfaz no ha sido comprobada en dispositivos físicos.

## Regresiones automáticas

- `src/clinical/diagnostic-impression-487.test.js`: 13 semillas, términos globales, nuevas patologías agregadas automáticamente, tipos de peritonitis, ausencia de spoilers y bloqueos de impresiones vagas.
- `src/integration/diagnostic-autocomplete-487.test.js`: código HTML compilado + DOM simulado, cuadro brillante, editor, opciones, guardar, teclado, cambio de paciente, espectador, ocultar al cerrar, integración de equivalencias.
- `src/clinical/peritonitis-pathways.bot.test.js`: el evaluador de peritonitis acepta equivalencias suministradas por el diccionario global sin admitir el diagnóstico genérico.
- `src/integration/peritonitis-487.bot.test.js`: cierre, destino seguro, recepción de enfermería y XP de los 3 casos.

No se deben tocar `main`, producción, credenciales, Supabase ni `vendor/atria-4.8.6` para esta funcionalidad.
