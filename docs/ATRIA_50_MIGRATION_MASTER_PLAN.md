# ATRIA 5.0 — Plan maestro de migración y criterios de salida

**Fuente técnica:** 4.8.7, preservada como control; rama de trabajo `atria-5.0-core-rebuild-experimental`.
**Punto funcional consolidado:** `0b36884fa4a879d49c588fa8f3f262a535dd3070` (teclado compacto, cámara de zona jugable, interpolación, apariencia sin teletransporte, CIRR y APP).
**Alcance:** 25 checkpoints numerados, incluido C01. Son puertas verificables de entrega, NO una promesa de plazo ni de un único commit por fase.
**Estado:** C01 funcionalmente consolidado; los checkpoints C02–C25 son pendientes y se marcan completos únicamente con evidencia. Las etapas grandes pueden dividirse internamente si falla una puerta de seguridad.

## 0. Invariantes obligatorios

1. No escribir `main`, producción, `vendor/atria-4.8.6/**` ni el antiguo baseline 4.8.7. Sin reemplazar la app estable antes de C25 y aprobación.
2. Una sola fuente clínica mutable: `src/v5/core/room-authority.js` + `src/v5/adapters/native-clinical-port.js`; no simular administraciones en DOM, bots, mensajes ni clientes. El ejecutor nativo y los comprobantes asociados al paciente gobiernan la ejecución.
3. Solitario, Aprendiz, Cooperativo y Competitivo comparten casos y fisiología. Los modos restringen permisos y ayuda, no crean motores clínicos paralelos.
4. Textos, botones y voz emiten órdenes al mismo router/envelope; un mensaje, una identidad, un eventId, una confirmación de estado nativo. Conversación global compartida; paciente próximo por defecto, Enfermera/Vega por mención o foco.
5. Un único scheduler del mundo, un único ciclo de vida de aplicación, un único renderer y un único motor de voz. El teclado compacto y la cámara adaptativa aprobados son contratos de diseño.
6. Evitar HTML generado/modificado por `replaceOnce`, `apply-487`, `eval`, monkey patches o dependencias de archivos históricos en `build:v5`. Extracción de algoritmos pura, con entradas/salidas y pruebas. Prohibido inventar nuevos mecanismos farmacológicos para sustituir la fisiología original.
7. Proteger: estudios reales y duplicados, preparación y vía, mediciones que no adelantan fisiología, cierres y XP exactamente una vez, fallos de red, cambio de atuendo sin cambiar posición, ausencia de vibración perceptible y de duplicación de listeners/RAF.
8. Cada afirmación de cobertura debe distinguir tests unitarios, Chromium emulado, navegador público y Android físico. Evidencia de una categoría no certifica las demás.
9. Cada checkpoint termina con informe de traspaso: SHA exacto remoto, rama, comparación con punto anterior, rutas modificadas, decisiones, pruebas y links, limitaciones, siguiente trabajo y comandos para reproducir; se conserva en `docs/migration/`.
10. No saltar gates por tener CI verde: si la interacción es visible o móvil, validar también desde UI real. Si falla, corregir dentro del checkpoint en vez de acumular deuda sobre el siguiente.

## 1. Inventario comprobado

- El contenido V5 conserva **13 casos**: CIRR-001, PANC-001, CROHN-001, HDA-001, COLON-001, PERI-PBE-001, PERI-SEC-001, PERI-TER-001, APP-001, CHOLE-001, ILEO-001, MESI-001, CHOLANG-001.
- CIRR-001 y APP-001 están implementados como rutas completas locales de atención; los otros once tienen datos/navegación/estudios, pero NO se consideran atención completa migrada.
- Referencia antigua: `src/clinical/` (68 entradas), `src/integration/` (63), `src/social/` (26), `src/voice/`, archivos y pruebas en `qa/`; los conteos incluyen pruebas y NO representan historias de usuario ni porcentaje de portabilidad.
- V5 ya tiene autoridad de sala, puerto clínico, estudios, cierre y XP para CIRR/APP, navegador independiente, teclado in-game, snapshots del mundo, cámara ajustada e interpolación visual con regresiones. La voz, tutor real, enfermería completa, guardia multi-paciente, carrera, salas sociales y 2–4 clientes reales NO están certificados en V5.
- Referencia para conducta antigua: `qa/ATRIA_487_FULL_CASE_JOURNEYS.md`, `qa/ATRIA_487_STABILIZATION_CHECKPOINTS.md`, `docs/QA_GATE.md`, `docs/REGRESSION_CONTRACT.md` y pruebas históricas. El original puede contener defectos: se documentan y corrigen explícitamente, no se copian.

## 2. Los 25 checkpoints

### Bloque A — Base, paridad de pantalla y exploración

**C01 — Consolidar la versión móvil aprobada. [IMPLEMENTADO / CI de fuente aprobada]**
- Operación: comparar ancestro, conservar rama de recuperación, avanzar experimental por fast-forward *sin force*, verificar identidad de SHA, mantener rama preview original.
- Aceptación: teclado funcional (4 filas), cámara con ancla por región jugable, controles y chat, imagen original, ambo sin teletransporte; `npm run test:v5`, `npm run build:v5`, Chromium navegación/teclado/CIRR/APP y `npm test`. Ver `docs/migration/STEP_01_HANDOFF.md`.
- Riesgo: cambios de layout y scheduling; gate obligatorio de equivalencia visual y cierre clínico.

**C02 — Matriz completa de comportamiento y contratos del legado. [PENDIENTE]**
- Comparar las 13 rutas clínicas y flujos no clínicos con 4.8.7, distinguiendo evidencia directa, código congelado y comportamiento deseado. Producir matriz en `docs/migration/`: `id`, fuente de referencia, módulo V5 destino, dependencias, signos/dosis/tiempos, UX, riesgo, prueba positiva/negativa y estado.
- Aceptación: cada módulo legible anterior queda clasificado `reutilizar puro`, `extraer`, `reconstruir`, `descartar obsoleto` o `pendiente deliberado`; sin funcionalidades silenciosamente omitidas.

**C03 — Portada, perfil, lobby, selección de guardia y HUD. [PENDIENTE]**
- Recuperar identidad y cuadro original mediante componentes de UI independientes; mantener teclado propio, mapa y cámara. Extraer del coordinador `application.js` responsabilidades de perfil/inicio cuando haya límites claros.
- Aceptación: entrada, reload, guardia/lobby, cambio de ambo en posición, selección/modal, foco móvil, mapa sin salto, cero listeners/RAF extra y captura Pixel emulado comparada.

**C04 — Examen físico original por segmentos. [PENDIENTE]**
- Trasladar regiones, técnicas, hallazgos y permisos desde el catálogo `exam-segments` y referencia efectiva; una selección visual produce comando verificado, progreso clínico real y registro de hallazgo. No marcar un sistema sano por ausencia de datos.
- Aceptación: matriz exhaustiva por caso/segmento y pruebas de hallazgo, múltiples revisiones, distancia, cierre y persistencia, sin `examDone` ficticio.

**C05 — Historia clínica, monitor, estudios y paneles. [PENDIENTE]**
- Separar componentes presentación/estado, conservar catálogo original y renderizar mediciones reales con su tiempo; estudios solicitados/pedidos/resultados y vías de tratamiento comparten la autoridad V5.
- Aceptación: recorrido completo de consulta/examen/vitales/estudios/revaluación, órdenes no duplicadas, UI móvil con teclado desplegado/oculto, ninguna intervención desde DOM.

### Bloque B — Comunicación y ejecución asistencial

**C06 — Diálogo de pacientes y anamnesis natural. [PENDIENTE]**
- Integrar intentos y respuesta contextual del paciente cercano sobre `guard-session`/router; preservar negaciones, preguntas compuestas, separación de roles y trazabilidad en el chat global.
- Aceptación: preguntas conocidas/ambiguas/no reconocidas y dos pacientes próximos; respuesta del receptor correcto, historial único, sin efectos terapéuticos por texto de pregunta.

**C07 — Enfermería: interpretación y órdenes combinadas. [PENDIENTE]**
- Reutilizar el scanner canónico probado `nurse-scanner-487`; completar vocabulario, mención/foco, negación, unidad, dosis, vía, estudios, cirugía, cláusulas combinadas.
- Aceptación: matrices de habla antiguas, órdenes parciales/rechazadas con motivo, una acción por cláusula admitida; un estudio no administra fármacos.

**C08 — Enfermería: trabajo físico, colas, monitor y comprobantes. [PENDIENTE]**
- Llevar las tareas reales vía/monitor/O2/fluidos/medicinas/consultas al ejecutor paciente-vinculado, con planificación, rango, preparación y confirmación del efecto, nunca confirmación anticipada.
- Aceptación: tareas multi-etapa y concurrentes, pacientes distintos y salas distintas, reintentos, desbloqueo de cola, tiempos clínicos; positivos y errores reproducidos de 4.8.7.

**C09 — Dr. Vega y Aprendiz docente. [PENDIENTE]**
- Recuperar docencia gradual: evaluación, hipótesis, preguntas, orientación, ayuda explícita y delegación válida, límites de intervención y rescate clínico grave; todo por autoridad y comprobante, no texto que finja ejecutar.
- Aceptación: sin spam ni ayudas duplicadas, no ejecutar tratamiento estable por inactividad, redirigir sin sustituir decisiones, rescate crítico acotado, Aprendiz vs Solitario.

**C10 — Voz sobre el mismo canal. [PENDIENTE]**
- Conectar captura/normalización, revisiones parciales, origen de dictado, cancelación y permisos al `chat.post` existente; el teclado sigue utilizable si el micrófono falla.
- Aceptación: mensaje por frase consolidada, sin duplicados ni primeras sílabas perdidas, comandos de voz/texto con igual resultado, pruebas Android de permisos/enfoque cuando corresponda.

### Bloque C — Motor clínico y los once casos restantes

**C11 — Terapéutica transversal y farmacología comprobada. [PENDIENTE]**
- Caracterizar y migrar catálogo de principios activos, dosis, vías, dependencias, órdenes de enfermería, reacciones y combinaciones al único puerto clínico. Reusar algoritmos puros originales verificables y bloquear dosis indefinidas.
- Aceptación: matrices de cobertura, dosis equivocada/vía incorrecta/negaciones/repetición, preparación e historial auténticos; jamás `requested = administered`.

**C12 — Fisiología avanzada, deterioro, rescate y seguridad. [PENDIENTE]**
- Reutilizar reglas nativas validadas para choque, sepsis, hemorragia, fluidos, O2, analgesia, noradrenalina, mortalidad y ventanas de gracia; un reloj paciente-autoridad y mediciones distinguidas de estado continuo.
- Aceptación: simulaciones comparadas con control sin tratamiento, 60Hz y stalls/tipo voz, subtratamiento/sobredosis, límite de rescate irreversible y ausencia de efectos inventados.

**C13 — Casos PANC, CROHN y COLON. [PENDIENTE]**
- Portar individualmente evaluación, estudios específicos, terapéutica, resultados y disposición; aunque se agrupan por carga técnica, cada caso tiene gate positivo y negativo propio.
- Aceptación: tres itinerarios UI completos con puntaje y XP único, resultados y dosis de referencia, rechazo de alta/diagnóstico incorrecto.

**C14 — Casos HDA e ILEO. [PENDIENTE]**
- Recuperar hemorragia digestiva alta, reposición, evaluación hemodinámica; y obstrucción íleo con hidratación, descompresión, balance y eventual derivación, sin afirmar procedimiento no efectuado.
- Aceptación: dos caminos completos, deterioro sin tratamiento y respuesta nativa, intervenciones/consultas y destino justificados.

**C15 — Casos CHOLE y CHOLANG. [PENDIENTE]**
- Colecistitis/colangitis con estudios, antibióticos, sepsis y derivación específica; descompensación y progresión medidas.
- Aceptación: dos caminos completos y negativos (retraso antibiótico, hipotensión, cirugía/ERCP derivada distinta de operación ejecutada).

**C16 — Caso MESI. [PENDIENTE]**
- Isquemia mesentérica con dolor desproporcionado, evaluación vascular y derivación urgente, sin falsificar control de foco.
- Aceptación: completo con priorización temporal, estudios y consecuencias documentadas, cierre correcto una vez.

**C17 — Peritonitis PBE, secundaria y terciaria. [PENDIENTE]**
- Recuperar vías diferenciadas: PBE, abdomen agudo perforativo y sepsis postoperatoria; cultivos y antifúngicos condicionados, cirugía/UTI y reglas de control de foco como consulta/derivación verificable.
- Aceptación: tres casos independientes más matrices positivas/negativas para shock, antibióticos, resultados tardíos y riesgo de muerte. Sin marcar cirugía realizada por indicar consulta.

### Bloque D — Hospital continuo y modos sociales

**C18 — Guardia continua y pacientes simultáneos. [PENDIENTE]**
- Admitir múltiples camas, pacientes, triage, recepción, enfermeras y casos simultáneos, manteniendo una instancia clínica por paciente con sus colas/relojes/estudios y navegación estable.
- Aceptación: alternar boxes y continuar tareas en segundo plano sin contaminación de UID ni mensajes, estrés 2/6/12/20 pacientes y regreso seguro al lobby.

**C19 — Carrera, puntuación, modos de práctica y persistencia. [PENDIENTE]**
- Reintegrar fórmulas de XP, tablas, niveles, evaluación de calidad, autonomía y distintos modos de guardia sobre una contabilidad exactamente-una-vez. Resolver conflicto multi-pestaña y persistencia.
- Aceptación: varios casos en secuencia, reload, cierres repetidos, concurrencia, pérdida/reconexión, modalidades con multiplicadores de fuente, sin XP inflado ni borrado.

**C20 — Lobby social y organización de salas. [PENDIENTE]**
- Reutilizar solo las interfaces estables de presencia, amigos, invitaciones, creación/salida de salas y transporte verificado; clínica local nunca dependerá del servicio social.
- Aceptación: identidades, 2–4 clientes navegadores independientes, limpieza de sesiones, falla de conexión visible, ausencia de estado fantasma.

**C21 — Chat global compartido y movimiento remoto. [PENDIENTE]**
- Mensajes globales ordenados, receptor contextual, deduplicación y entrega confirmada; snapshots visuales remotos interpolados, espectadores cercanos, salas independientes, misma autoridad clínica.
- Aceptación: dos/tres/cuatro dispositivos simulados independientes; cero pérdida silenciosa, sin eco/duplicación, cero vibración remota, suspensión/reconexión y separación entre salas.

**C22 — Cooperativo completo. [PENDIENTE]**
- Solitario compartido con un solo estado clínico por paciente y permisos de interacción iguales para todos, atribución por ejecutor confirmado; órdenes y enfermería compartidas.
- Aceptación: 2–4 clientes, estudios/administraciones/monitores/reevaluación/XP únicos, carreras y alternancias de dueño de UI, desconexión del anfitrión.

**C23 — Competitivo completo. [PENDIENTE]**
- Apropiación por primera interacción clínica válida, lectura de paciente rival sin mutación, reloj competitivo, marcador y resolución de cierres; nunca confiar actor/UID del paquete no autenticado.
- Aceptación: ataques de repetición/forja, carreras simultáneas, 2–4 clientes, estudio y fármaco rival bloqueados, permisos de observación y puntuación sin duplicaciones.

### Bloque E — Optimización y sustitución segura

**C24 — Rendimiento, accesibilidad y dispositivos físicos. [PENDIENTE]**
- Medir movimiento, cámara, teclado ATRIA, HUD, overlays, voz, suspensión/reanudación, cambio de orientación y memoria/GC; presupuesto razonable en Android e iOS y desktop sin degradar clínica.
- Aceptación: pruebas reales en Android (obligatorias), iOS/Safari cuando haya dispositivo, matriz de pantalla y teclado nativo suprimido, estabilidad visual sostenida, sin pérdidas de listeners ni error de focos.

**C25 — Equivalencia global, limpieza y liberación. [PENDIENTE]**
- Ejecutar ambos productos contra matriz de funcionalidades y casos, auditar bundle por dependencias históricas, retirar solo implementaciones redundantes que ya NO usen las rutas V5, conservar baseline archivado e historial de decisiones.
- Aceptación: 13 casos clínicos, 4 modalidades, voz, social, progresión, seguridad y rendimiento; CI/histórico y UI 2–4 clientes verdes; Android físico revisado y aprobación explícita del usuario **antes** de cambiar producción.

## 3. Secuencia que se repetirá en C02–C25

1. **Preflight**: confirmar HEAD de la rama, último informe y base estable; no trabajar sobre HEAD inesperado. Recuperar el último estado de `docs/migration/STATUS.md`.
2. **Caracterización RED de la referencia**: encontrar comportamiento nativo y construir prueba positiva, negativa y de regresión; congelar resultados y tiempos si son clínicos.
3. **Implementación coherente**: extraer componentes puros en su dominio; UI solo envía comandos y representa snapshots; evitar wrappers de parches y sistemas redundantes. Un commit por cambio lógico revisable.
4. **QA GREEN**: `npm run test:v5`, `npm run build:v5`, suite Chromium aplicable, flujos completos CIRR/APP y `npm test` histórico. Añadir tests para casos nuevos; CI no debe excluir pruebas viejas.
5. **Verificación de publicación**: SHAs exactos, CI concluida, preview matching commit READY, Android físico cuando el cambio lo exija. No confundir deployment READY con prueba de uso.
6. **Handoff**: `docs/migration/STEP_NN_HANDOFF.md` con comandos de reproducción, URLs, causas, opciones rechazadas, limitaciones y siguiente misión; `docs/migration/STATUS.md` actualizado. La próxima conversación puede continuar sin historial privado.
7. **Gate humano**: si cambia el comportamiento visual o jugable, solicitar aceptación antes de extender la migración. Si falla, regresar al punto anterior y corregir; no promover parcialidad.

## 4. Significado de «ATRIA entera»

No depende de cumplir una fecha, ni de borrar todos los archivos `*-487.js` del repositorio. Depende de que el **build de V5** no ejecute cadenas de reemplazo históricas y de que la aplicación nueva cubra 13/13 casos completos, los cuatro modos, enfermería, tutor, voz, progreso, chat y presencia sociales, movilidad, clínica multi-paciente y protocolos de sincronización. Las diferencias frente a errores históricos tienen que estar documentadas y aprobadas.

Los **25 pasos son un desglose inicial basado en inventario real**, no una garantía matemática de que no aparecerán dependencias. Si una etapa exige 2 sub-checkpoints verificables, se registrarán como Cnn.a/Cnn.b; si algo falta en el inventario, se añade a la matriz C02 en vez de declararlo hecho. Jamás sacrificar la fidelidad clínica para mantener artificialmente el número 25.
