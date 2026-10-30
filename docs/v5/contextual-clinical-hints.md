# Pistas clínicas contextuales

Especificación vinculante: misión del usuario del 30-10-2026. Rama única:
`atria-5.0-core-rebuild-experimental`. Base remota verificada: `a0c4b11`.

## Integración encontrada (checkpoint 1)

- `patient-actions.js` dibuja el menú anclado al UID del paciente.
- `application.js` confirma selección/proximidad y conecta las sesiones locales
  o la réplica persistente. No crear otro control global.
- `guard-session.js` posee un paciente y sus recibos reales. Los ejecutores de
  `acute-care.js` y `cirr-care.js` conservan la única autoridad clínica y de cierre.
- `clinical-policy-closure.js` y `gastro-closure-v5.js` evalúan reglas declarativas.
  Los diez contratos heredados y peritonitis usan sus evaluadores originales.
- `native-medication-eligibility.js`, `receipts.js`, `transfer-continuation.js`
  ya resuelven elegibilidad, ejecución y preparación para traslado.
- `guard-runtime.js` confirma propietario/foco por médico, persiste cada sesión
  y emite un claim por médico. `durable-guard-authority.js` protege el agregado
  con lease y CAS. Las pistas deben viajar dentro de esa misma transacción.

## Decisiones de implementación

Los evaluadores V5 devolverán requisitos pendientes estructurados junto a sus
mensajes existentes, desde la misma condición que bloquea el cierre. Los
evaluadores heredados permanecen intactos: un adaptador de lectura identifica
qué evidencia levanta cada bloqueo consultando el evaluador original sobre
snapshots de evidencia, sin ejecutar tratamientos ni simular fisiología.

Un selector puro elegirá un requisito, resolverá alternativas y dependencias
con las definiciones clínicas y comprobará la orden con el router real. Un
registro compartido de controles proveerá las mismas etiquetas que la interfaz.
Las órdenes en curso producirán espera gratuita cuando no haya trabajo
independiente útil. Los destinos usan el cierre automático, sin interconsulta
manual añadida.

Cada atención persistirá ofertas e historial por médico. Preparar/revalidar una
pista es gratuito. Solamente el acuse de presentación de una oferta vigente,
por el solicitante autenticado, registra una pista nueva. La interfaz descarta
respuestas de una selección/guardia/petición anterior. Ningún mensaje clínico
compartido contendrá la pista privada de otro médico.

La XP clínica base y la puntuación se conservan. El recibo individual aplica
`floor(XP_obtenida * max(0, (20 - pistas_nuevas) / 20))`, después de los
multiplicadores aplicables. La clave semántica identifica acción e indicación;
no depende de relojes, revisiones de red o el nombre visible del paciente.

## Verificación

Pruebas específicas: selector, comandos/etiquetas, estados pendientes, alternativas,
shock, cierre/rechazos, idempotencia y 0 XP, médicos separados, CAS/reconexión,
selección/respuestas tardías y menú en escritorio/Android. Comprobar referencias
ejecutables de los 55 casos y bots representativos guiados por las pistas.
Ejecutar regresión de módulos afectados y build; conservar la certificación
anterior sin repetir su campaña de 550 escenarios.
