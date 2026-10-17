# ATRIA 5.0 — C12.f1a: supervivencia nativa reutilizando evaluadores puros V4.8.7

Fecha: 2026-10-17. Rama única: atria-5.0-core-rebuild-experimental.
Base C12.f0: e6a0d74a8ddf7662b945f4a7e596bf04c8347f1c (CI 39005400670 4/4).
Código C12.f1a: dea9e9fde4cfdc63facdc5fbee978decd77f6b39.
Corrección de contrato de build: c6c3330cf9ad8271dd8d653e3330fa847cacafde.
Hardening de procedencia clínica: 63621730b377bcfbe9bb91bab551d3d30294497e.
CI de este código: https://github.com/javierdario48-star/ATRIA/actions/runs/39007257603 (estado 4/4 verificar en el enlace).
CI: https://github.com/javierdario48-star/ATRIA/actions/runs/39006930906

## Qué reutilizamos del legado (sin HTML)

1. src/clinical/grace-survival-487.js, csGraceState487: ventana real inicial de 180 segundos y crédito documentado hasta 480 segundos en total. La protección se basa en intervenciones verificadas, no prescripciones.
2. src/clinical/critical-rescue-487.js, csCriticalRescueEvidence487 y csCriticalRescueWindow487: criterios de hipoxemia/colapso circulatorio y ventana no renovable de 65 segundos para soporte genuinamente administrado.
3. Del contrato fatal efectivo caracterizado por V4 se conserva el umbral de exposición acumulada de 1.35 minutos nativos. No se importan scripts HTML, wrappers de updateSimulation, ni los modelos B1 en sombra.
4. scripts/build-v5.mjs permite explícitamente solo estos dos módulos puros adicionales. La primera CI sobre dea9e9f reveló el gate correcto 'undeclared V5 dependency'; se corrigió mediante allowlist exacta, sin eliminar el gate ni ampliar a src/integration.

## Implementación

src/v5/clinical/survival-487-bridge.js adapta el registro nativo de administración (UID, sourceEventId, acciones start/stop) al contrato de lectura V4, con exposición de fluidos medida por summarizeIVExposures, correspondencia 1:1 con tratamientos IV nativos y dispositivo de oxígeno activo comprobado (dosis, evento y paciente). Mantiene un solo estado p.survival (crédito bancado, exposición fatal acumulada, ventana de rescate y causa). No establece otros timers ni otros escritores de liveVitals.
src/v5/clinical/guard-session.js llama al adaptador una vez por avance del único reloj, después de care.advance y antes de refreshMonitoring. src/v5/clinical/app-care.js y cirr-care.js leen patientDied real en la política de cierre, ya no 'dead:false'. Fallecimiento marca caseEnded, impide administraciones y cierres posteriores, y no concede XP.
Los intervalos de gracia se calculan en segundos reales; exposición se acumula en minutos nativos, conforme al legado. Grandes saltos de reloj no atribuyen retrospectivamente exposición si el estado crítico apareció por primera vez durante ese salto. El soporte confirmado puede retrasar la fatalidad, pero no restaura por sí solo signos críticos.

## Pruebas y resultados

src/v5/clinical/survival-487-bridge.test.js comprueba también que un log IV sin tratamiento confirmado, o un log de oxígeno sin dispositivo activo, jamás conceden gracia ni rescate. El resto comprueba: protección inicial y muerte no instantánea, deterioro prolongado, evidencia auténtica, rechazo de UID falso, ventana de rescate no renovable, continuidad del caso estable y seis bots reales.
CI de la versión de allowlist 39006930906: 287/287 V5, 40/40 core y 4/4 trabajos completos; build V5 aprobado. El hardening añade 1 test V5 (288) en la CI 39007257603. Consultar CI para estado final de navegador y regresión histórica.
Bots positivos APP/CIRR: vivos, cierres quirófano/sala, 133 XP, no doble cierre.
Bots perjudiciales (20 administraciones reales de cristaloide, 10.000 ml): APP SpO2 72.08%, FR42 y fallecimiento, CIRR SpO2 72%, FR42 y fallecimiento, ambos 0 XP. Muerte no es resultado automático de prescribir: requiere intervalo crítico posterior a la gracia.
Bots de abandono: APP no empeora aún por evolución espontánea; CIRR estable permanece sin cambio. Gate estricto ahora señala 2 brechas, no 4: APP-001/untreated-disease y clock/24h.

## Límites importantes

- Aún falta progresión natural APP basada en el caso y validación de deterioro clínico contra ejecución efectiva V4. No se debe extrapolar peritonitis aguda del legado a APP estable sin evidencia.
- El reloj actual no cumple 24 horas simuladas en 24 minutos reales: sigue generando 172.8 min nativos en 24 min reales. No cambiar el coeficiente global sin pruebas del estudio, enfermería y cinéticas.
- El fallecimiento ya está en la sesión nativa, pero faltan UI/animación de muerte, transición de muerte en el snapshot compartido del room-authority, cancelación integral de trabajos de enfermería pendientes y sincronización online. No confundir read().patient.patientDied con una UI completa de fallecimiento.
- La gracia heredada concede créditos por evidencia de intervenciones incluso si luego se observa toxicidad por exceso: auditar este comportamiento antes de proclamar una política clínica totalmente calibrada.
- No se habilitaron Coop ni Competitivo, ni se agregaron fármacos o casos. El catálogo de 30 tratamientos sigue distinto de las administraciones ejecutables.

## Siguiente avance recomendado

C12.f1b: reproducir del ejecutable V4 la progresión de APP no atendida, enriquecer bots con un rescate real temprano y otro tardío, verificar fallecimiento/XP/solicitudes pendientes y representar desenlace en el room authority y la interfaz. Luego resolver reloj de 24h sin romper V4 y retomar farmacología. Conservar limpio el core, no duplicar escritores ni volver a insertar HTML heredado.
