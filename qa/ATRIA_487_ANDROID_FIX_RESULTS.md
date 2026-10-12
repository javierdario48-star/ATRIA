# ATRIA 4.8.7 — Correcciones de enfermería y cierre tras evidencia Android

Fecha: 2026-10-12. Repositorio: [javierdario48-star/ATRIA](https://github.com/javierdario48-star/ATRIA). Rama exclusiva: [atria-4.8.7-closure-harm-combinatorial-qa](https://github.com/javierdario48-star/ATRIA/tree/atria-4.8.7-closure-harm-combinatorial-qa).

## Recuperación y alcance

El HEAD remoto recuperado coincidía con `5c5e06ba56c8a1fdf029fc0fc9fd117a0f7355b7`; no había commits posteriores. Se revisó el [CI verde 38203666699](https://github.com/javierdario48-star/ATRIA/actions/runs/38203666699), los workflows y checkpoints existentes. Se conservan todas las correcciones anteriores. Los cambios se publican mediante avance normal de la rama exclusiva, con comprobación del HEAD esperado y de cada árbol Git. Los SHA publicados difieren de los SHA locales porque GitHub crea los commits, pero sus árboles son idénticos.

No se modifica ni fusiona `main`, producción, el contenido de `vendor/atria-4.8.6`, Supabase, credenciales, multijugador, movimiento, micrófono, mapas, reloj general, protección contra muerte precoz ni los pisos fisiológicos. No hay segundo motor de enfermería, farmacología o XP.

## Causas y correcciones

| Defecto observado | Causa reproducible | Cambio / resultado |
|---|---|---|
| Vías + monitor | Los adaptadores se insertan en el primer `</body>`, antes de scripts nativos posteriores. V412 reasignaba `nurseNatural` a un único mejor resultado, anulando el despachador compuesto. | V412 conserva sus guards y delega al mismo despachador existente. «Vías» solicita dos; «vía», una. Los procedimientos cambian realmente `venousAccessCount` y `monitorConnected` antes de confirmar finalización. |
| Ceftriaxona + metronidazol | El mismo enrutamiento tardío retenía un solo medicamento. Las pruebas antiguas no cargaban esa reasignación. | Cada cláusula llega a la cola nativa y produce su administración y recibo. Sin acceso se retienen ambos, sin duplicar pendientes; se ejecutan tras canalización real. «Ambos antibióticos» requiere una pareja explícita del mismo encuentro. |
| Oxígeno omitido | El rechazo de una indicación de noradrenalina abortaba todo el mensaje; ciertas vías desconocidas también desactivaban el análisis completo. | La aclaración afecta únicamente al medicamento inválido. Oxígeno independiente se ejecuta y queda activo/registrado. Se conserva el modelo nativo limitado de SpO₂. |
| Dosis solicitada pese a default | El contrato tardío de noradrenalina pedía tasa antes de llegar al catálogo. Además, se perdían dosis anteriores al nombre y algunas vías explícitas. | Se mantiene el default nativo de noradrenalina **0,05 µg/kg/min** y los otros defaults existentes. Se preservan dosis por cláusula. Cero, negativos, unidades no interpretables y vía oral/IM incompatible requieren aclaración, sin convertirlos en default IV ni bloquear otras órdenes. El recibo conserva `doseDisplay` y `defaultApplied`. |
| Betabloqueante repetido y FC >100 | No se reprodujo ausencia de efecto: el control equivalente tiene una FC mayor. El shock mantiene estímulo compensador; hay preparación y suavizado temporal. El piso de presión 55/30 puede ocultar deterioro adicional. | Se conserva el mecanismo original. Se añade auditoría comparativa de exposición, tiempo, contractilidad y objetivos nativos sin obligar a FC <100 ni inventar complicaciones. Sus limitaciones se detallan abajo. |
| 87/100 seguro con 0 XP | `ns422-experience-policy`, cargado después, sobrescribía la elegibilidad por `treatment.complete`, que seguía exigiendo control de foco. Por ello V19 calculaba `resolved=false` y «manejo incompleto» aunque el pase quirúrgico legítimo ya estaba registrado. | La política nativa consulta el comprobante existente de pase seguro antes de su fallback. Se preservan caso, identidad y destino. También se conserva el comprobante nativo de los otros diez casos, cuya posición incorrecta en el VM histórico había ocultado el mismo problema. `csResultCareer`, `_careerEndProcessed`, cálculo, guardado y HUD originales acreditan XP una sola vez. |

La revisión independiente encontró esas omisiones de carga y seis casos adicionales de dosis/vía. Se reprodujeron en rojo antes de corregirlos. El entorno nuevo ordena los bloques por su posición real en el HTML generado y usa `inferRecipient` original con una enfermera cercana explícitamente simulada; incluye el envío diferido de V412.

## Antes y después

| Prueba | Antes | Después |
|---|---|---|
| Órdenes de la reproducción inicial | 9/26 correctas | Batería ampliada: **233/233** |
| Vías/monitor en ambos órdenes | Monitor sin dos vías | Dos vías y monitor reales |
| Dos antibióticos | Solo metronidazol | Dos administraciones independientes |
| Oxígeno + noradrenalina sin dosis | Ninguna administración por aclaración global | Oxígeno + tasa nativa predeterminada |
| Ceftriaxona vía oral + oxígeno | Ceftriaxona IV default administrada indebidamente | Ceftriaxona aclarada; oxígeno ejecutado |
| 2 g antes de ceftriaxona + 250 mg antes de metronidazol | Defaults 1 g / 500 mg | Dosis explícitas 2 g / 250 mg, sin marca de default |
| Secundaria, 87/100 y pase aceptado | Cierre real; 0 XP; `resolved=false` | **195 XP**; perfil, guardado, carga, tarjeta y HUD coherentes |
| CIRR con orden real de scripts | Cierre legítimo con 0 XP | Recompensa nativa positiva |
| Cierres de las 13 semillas | Harness histórico incompleto para carga tardía | **52 cierres pagados**: mínimo/completo × solo/aprendiz × 13 |

No se atribuye a Android el resultado de estas pruebas Node.

## Bot de órdenes y regresiones

La batería de 233 escenarios verifica el estado y recibos después de procedimientos y timers nativos: permutaciones de vías/monitor/oxígeno y ceftriaxona/metronidazol/oxígeno; comas, conjunciones, texto sin puntuación y «después»; acceso ausente/presente; paciente crítico/estable; defaults y dosis explícitas; órdenes pendientes/repetidas; pareja contextual; rutas y dosis inválidas; abreviatura O2. Antes de completar los timers no se anuncia ni registra una dosis ejecutada.

Se reutilizan los bots históricos: 72.881 subconjuntos léxicos exhaustivos hasta cuatro elementos, 1.199 variantes de acceso, 1.946 combinaciones mayores y 480 análisis integrados históricos; 18 checks funcionales de noradrenalina; regresiones de oxígeno, morfina, cola, permisos, identidad y veracidad de recibos. La matriz de 30 tratamientos × 13 casos conserva 390 comprobaciones: 377 administraciones verificadas y 13 controles de foco pendientes, sin fabricar su ejecución. Esto comprueba entrega y estado, no 390 efectos médicamente validados.

## Cierre genuino, XP y persistencia

La reproducción de la captura usa el finalizador generado genuino y V19: diagnóstico correcto, soporte y dosis realmente administradas, estudios y aceptación quirúrgica como prerrequisitos de fixture. El botón nativo llama a la secuencia de destino/pase/cierre. `sourceControlled` sigue siendo falso.

El scorer produce **87/100**, la tarjeta HTML nativa dice **ATENCIÓN SEGURA** y **+195 XP**. Se aplican los multiplicadores originales: solo 1,2 × práctica 1 × complejidad 1,65. El saldo real es 195; `csSaveProfile` lo guarda y `csLoadProfile` lo recupera. El HUD original muestra **195 / 200 XP**, con 97,5% de barra. Repetir botón/`finishCase()` no paga otra vez; cambiar identidad invalida el comprobante; el siguiente paciente conserva el saldo.

En las 52 variantes se rechazan interconsulta necesaria pendiente y tratamientos solo solicitados; se pagan cierres mínimos y completos sin exigir cirugía, drenaje, ERCP o revascularización realizada. Ejemplo de calidad baja: COLON **54/100 → 81 XP solo / 67 XP aprendiz**. Mayor calidad genera más XP dentro del mismo caso y modo. Los cierres hablados de CIRR/HDA siguen llegando al finalizador legítimo tras V412.

Además, una secuencia parte de evidencia clínica vacía: entrevista generada original, cinco técnicas reales de examen, vías/monitor/medicación, extracción y timers de laboratorio, solicitud y aceptación nativa de Cirugía y botón de pase. Termina en **84/100 → 190 XP**. Aquí no se precargan resultados de estudio, examen, tratamiento ni interconsulta. La elección diagnóstica es entrada del jugador. El actor, proximidad, navegación, DOM y almacenamiento permanecen emulados.

Los resultados crudos se generan en `qa/android-fix-results/` y se incluyen en el artifact de Actions junto con las matrices históricas. Los harnesses con `finishCase()` bloqueado siguen etiquetados como tales y no se usan como prueba de recompensa nativa.

## Auditoría del betabloqueante

24 escenarios: estable, taquicardia sinusal sin shock, shock hipovolémico, shock distributivo, bradicardia basal e hipotensión grave × 1/2/3/4 administraciones reales de 40 mg; 168 puntos tratados/control a 0,25, 1, 5, 30, 60, 90 y 150 segundos reales, registrando también el tiempo nativo. Solicitud explícita: propranolol oral. El recibo pertenece a la clase nativa `beta_blocker`; la captura no identifica inequívocamente molécula, vía ni intervalo.

| Shock distributivo, 60 s | FC (lpm) |
|---|---:|
| Control equivalente sin tratar | 158,50 |
| Una administración, 40 mg acumulados | 144,98 |
| Dos, 80 mg | 135,70 |
| Tres, 120 mg | 126,66 |
| Cuatro, 160 mg | 117,86 |

Hay reducción de respuesta cronotrópica frente al control y deterioro nativo de contractilidad. En bradicardia se alcanza el piso existente de 38 lpm; no se elimina. Se registran FC, FR, PAS, PAD, PAM, SpO₂, volumen efectivo, resistencia vascular, contractilidad, hipoperfusión, objetivos antes del clamp, exposición acumulada, recibos y eventos.

Las fichas primarias de [propranolol — DailyMed](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=14d0c95d-418f-40a8-bad3-e20c82424960) y [carvedilol — DailyMed](https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=454054f1-0730-41b3-844a-c7b65f1b47c5) sustentan efectos cronotrópicos/inotrópicos negativos, riesgo en shock/bradicardia y acción oral diferida. **El simulador no valida esas cinéticas cuantitativamente**: agrupa agentes, no implementa absorción oral, concentraciones, semivida individual ni trastornos de conducción específicos. Sus términos simplificados de repetición y suavizado se conservan; no se presentan como un modelo farmacocinético validado. No se modifica fisiología para forzar el resultado.

## Archivos y verificación

Runtime: `src/clinical/nurse-scanner-487.js`, `src/integration/nurse-voice-487.js`, `nurse-execution-487.js`, `manual-monitor-iv-487.js`, `case-completion-487.js`, `peritonitis-487.js`, `apply-487.js`.

QA: `qa/android-integrated-runtime-487.mjs`, `android-integrated-orders-487.mjs`, `android-integrated-xp-487.mjs`, `beta-blocker-audit-487.mjs`, `android-fix-baseline-487.json`, `physiology-live/native-journey-487.mjs`, `physiology-pilot/rescue-source-compatibility-487.mjs`, `physiology-pilot/verify-artifact-487.mjs`, el test funcional existente de noradrenalina, `package.json`, `.github/workflows/qa.yml` y estos documentos/checkpoints.

Los fingerprints actuales cambian solo para el puente de XP y la exposición de la lista IV ya existente. Las fuentes históricas congeladas y las **4.537 comparaciones numéricas** conservan sus valores y tolerancias. La comprobación del HTML protegido mantiene `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7` tras retirar exclusivamente los deltas enumerados. Build, sintaxis de scripts generados, módulos y copias del golden master forman parte del workflow completo.

## Checkpoints publicados

| Paso | Commit GitHub |
|---|---|
| A: recuperación y reproducción roja | `e6af39b3e367bce2373bf62abd7f0662f2d79e7b` |
| B: despachador conservado tras V412 | `4b214a37df0fbda8b30f9d7b92ff59234db99b98` |
| C: órdenes parciales y defaults | `c19f7246b300c5e034b67a0b79c50fe02890b1f9` |
| C: vía del medicamento separada de canalización | `c8b38a29eca979a6b7ad3ef3ae97b029330fbbaa` |
| D: política tardía y pase seguro de peritonitis | `24cfead022bfb829dcd6a7e27b900913283a9253` |
| E: auditoría comparativa original | `68b5d54138be8e87340461894558528d5542e81e` |
| F: revisión, carga real, otros casos y dosis/vías | `68e4eb3babaa035880ee04cbf10830bcd5aac6f6` |

El commit final añade evidencia, wiring de CI y fingerprints enumerados. Su SHA, run exacto de Actions y disponibilidad de preview se confirman en la entrega. Se ejecuta un único workflow completo al avanzar esta rama. Un preview solo se identifica como válido si su metadata coincide con ese SHA y está READY.

## Pendientes y límites

No se realizó prueba física Android ni prueba completa en navegador. El VM integrado sí ejecuta fuentes generadas, carga tardía, timers, finalizador, carrera, persistencia y HTML/HUD nativos con superficies de entorno simuladas. La mayoría de la matriz de cierres usa prerrequisitos de estudio/interconsulta preparados; una secuencia completa los obtiene mediante funciones originales.

Persisten las limitaciones del betabloqueante agrupado y los pisos descritos. El bot histórico de daño también conserva dos hallazgos diagnósticos: furosemida en PERI-SEC/CHOLANG no presenta daño hemodinámico adicional medible en su ventana y exposición de prueba. No son regresiones ocultadas ni se fabricaron efectos para eliminarlos. Los trece controles de foco no ejecutados en la matriz de entrega son pendientes explícitos. Ninguno se usa como requisito ficticio de operación realizada para pagar un pase apropiado.
