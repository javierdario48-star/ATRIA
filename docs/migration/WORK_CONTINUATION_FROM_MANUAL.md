# Orden de trabajo para ChatGPT Work — continuidad fiel de ATRIA 5.0

**No ejecutar una nueva reconstrucción.** Esta orden depende del [manual maestro canónico](ATRIA_50_MANUAL_MAESTRO_FUNCIONAL.md) y del [handoff técnico actual](CURRENT_HANDOFF.md). Leelos completos antes de modificar código. El manual contiene decisiones de jugabilidad, fuente de referencia V4, contratos de cierre de los 13 casos, clínica libre, Chat, Vega, enfermería, tiempos, multijugador y pruebas.

## Rol y objetivo

Actuá como ingeniero principal de ATRIA. Quiero **implementación real con commits y CI**, no un nuevo informe de ideas. La prioridad es recuperar **toda la jugabilidad que ya existía en 4.8.7** dentro de V5, conservando los componentes V5 que funcionan y resolviendo su principal falla histórica: **multijugador**. No inventes nuevos casos.

Repositorio: javierdario48-star/ATRIA. Rama de trabajo única: atria-5.0-core-rebuild-experimental. Base de manual: código 26cc058a30485191749b6df485f2a5221c525676, HEAD documental posterior dee1f7f838afa6c1d6ff662be5d7471ebb07ad54 y commits documentales siguientes. **Consultá HEAD remoto antes de comenzar; nunca sobrescribas avances concurrentes.** No tocar main, V4.8.7, vendor/atria-4.8.6 ni producción.

## Prioridad 1 — No permitir que se pierdan las reglas de cierre y UX

El usuario acaba de precisar cómo era la jugabilidad del legado, confirmada en los evaluadores:

- La ventana **Impresión diagnóstica** flota **sobre el paciente** durante la atención; autocompleta términos de todas las patologías, sin filtrar las sugerencias por el caso oculto ni dar pistas indebidas. Fuente: src/integration/diagnostic-autocomplete-487.js y src/clinical/diagnostic-impression-487.js.
- El cierre está determinado por las condiciones particulares: anamnesis pertinente, examen, signos monitorizados, estudios relevantes completados (salvo emergencia), tratamientos realmente ejecutados, reevaluación, impresión diagnóstica compatible y destino seguro. Más profundidad y pertinencia suman calidad; sobreestudiar descuenta. Reusar csEvaluateClosure487 / csClosureQuality487 para diez casos y csPeritonitisEvaluate487 para las tres peritonitis, no un checklist universal nuevo.
- La opción de **Dar de alta, Sala, Observación, UTI, Quirófano o Procedimiento** debe **aparecer como destino disponible únicamente cuando el paciente está listo**, sin obligar al jugador a buscar un comando oculto. V5 hoy muestra botones deshabilitados y un campo DX dentro de Resolver: falta paridad UX.
- **Cirugía puede solicitarse de manera anticipada** por «Enfermera cirugía», otro comando o botón. La consulta queda pendiente, Cirugía analiza la impresión, hallazgos y urgencia, puede rechazar por datos faltantes, diagnóstico no compatible o imagen insuficiente y dar feedback específico. Puede aceptar EVALUACIÓN urgente en shock antes de completar todo, pero la consulta aceptada no implica que el traslado esté habilitado. Enfermería debe comunicar requisitos pendientes. En V5 APP Cirugía se acepta automáticamente tras una demora: corregir reutilizando csSurgicalReview487 como módulo puro, la misma autoridad, UID, cola y recibos. No copiar la integración global antigua.
- Una vez aceptado el receptor y completos los requisitos, se habilita **Derivar a quirófano**, se cierra la guardia y se otorga XP único; NO exigir operar, endoscopiar, controlar foco en box o normalizar cifras en un shock que debe transferirse urgente. Conservar sourceControlled inalterado.
- En todos los destinos, evaluación de elegibilidad y calidad son conceptos separados. Hasta 15 DX +15 historia +25 seguridad +15 estudios +25 tratamientos/destino +5 eficiencia, menos extras y complicaciones; XP original, no segundo evaluador.
- **Libertad médica total:** alergia/heparina/errores clínicos no bloquean una orden válida. Reacción adversa solo tras administración real, evolución y posible rescate/muerte; no daño por una orden pendiente. C1 ya lo hizo; no regresar a C12.k previo ni crear bloqueos.

Primero caracterizá con pruebas RED→GREEN las diferencias APP/CIRR V5 respecto de este flujo V4. Trasladá la UX y la consulta contextual por checkpoints pequeños **sin alterar lo que ya funciona**. No implementes procedimientos inexistentes para completar el cierre.

## Prioridad 2 — Continuar C2.c farmacología antigua

Después (o por un checkpoint aislado si mantiene ambas fronteras), completar albúmina (g/kg), noradrenalina (infusión titulable/cancelable) y transfusión con el mismo circuito nativo y reglas reales de V4. Resolver el bug de «Enfermera monitor y albumina 1.5 g/kg» confundido con hepatograma, y la unidad mg/kg perdida en anfotericina. Reusar los 15 IV existentes sin volver a programarlos. Las 30 entradas incluyen procedimientos, no 30 moléculas; indicar exactamente qué tiene ejecución real y efectos. No copiar B1 defectuoso ni wrappers HTML.

## Prioridad 3 — C3 fisiología y PERI

Migrar el ejecutor PERI-SEC-001 mediante sepsis-physiology-487-core.js ya extraído, con un único escritor de signos; emparejar el inmediato original y posterior rescate, medicaciones, cobertura y foco. Probar de principio a fin paciente → interconsulta con respuestas → destino quirófano → score y XP sin modificar sourceControlled. Luego PBE/TER con criterios originales, sin bloquear cultivos tardíos ni exigir cirugía realizada.

## Prioridad 4 — C4 resto de los 13 casos y C5 multijugador real

Tras las tres peritonitis, incorporar los otros ocho ejecutores ya existentes (no crear contenido nuevo), con reglas originales de anamnesis/examen/estudios/tratamientos/destinos. En paralelo solo cuando sea estable, integrar **el mismo motor** a cooperativo y competitivo.

Cuatro modos:
- Aprendiz con Vega docente, Solitario autónomo.
- Cooperativo 2–4: todos pueden tratar el mismo paciente; chat único, enfermería única, recibos compartidos.
- Competitivo 2–4: primer inicio de interacción clínica válida obtiene el paciente; rival solo observa.
- Lobby social compartido, party/invitaciones y múltiples guardias independientes; Chat global por guardia, paciente cercano por defecto, tocar Enfermera/Vega prepara mención en el mismo editor; mensajes/reintentos nunca perdidos ni duplicados.
- Probar red, movimiento remoto, 2/3/4 navegadores independientes, reconexión, dos médicos tratando/cerrando simultáneamente, XP único y muerte; los bots HTTP ya verdes NO demuestran multijugador jugable.

## Contratos de ingeniería

Un dueño de estado y signos por paciente; un scheduler; historia y observaciones derivan solo de sucesos reales; idempotencia por actor/eventId; mismos casos en los cuatro modos; una sola autoridad sobre pacientes y enfermería. El reloj visible: 1 min real = 1 h de juego. El dominio interno farmacodinámico es distinto (.12/.03 native minute/real second); no escalar todos los tiempos globalmente. Muerte y rescate se conservan.

Preservar mapa, movimiento/cámara, sprites, teclado compacto propio móvil, ventanillas y chat actuales. Nada de reconstrucción integral ni cambios estéticos inventados en esta etapa.

## Puerta de validación y entrega

Verificar las CI previas antes de modificar y después de cada commit:
- npm run test:v5 (base 374 tests), npm run test:v5-core (base 40);
- npm run build:v5, npm run build:v5-core y node scripts/audit-v5-boundary.mjs;
- npm test completo original (incluye 421 enfermería, 131 cierres, 39 daños);
- tests reales de diagnóstico flotante, consulta rechazada/aceptada, retorno pendiente, cierre contextual, XP exacto y destino habilitado automáticamente; bots F/G/I de multicliente;
- navegador de escritorio/Pixel emulado, y dispositivo físico si hay acceso; distinguir evidencia real de emulación.

No dejar tests verdes reduciendo expectativas ni atribuir funcionalidad plena a un botón o una ruta mockeada. Antes de publicar preview verificar SHA y resultado del build. A cada checkpoint: SHA, CI, evidencia, cambios de código, regresiones negativas, lo no migrado y próximo paso. Actualizar CURRENT_HANDOFF.md. Si no se llega a todos los puntos, terminar en el último estado verde y documentar fronteras: **implementación parcial con precisión es mejor que falsa completitud**.

**Comenzá a implementar, no me devuelvas otro plan general.**
