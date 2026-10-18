# C3.a — peritonitis secundaria con fisiología original y derivación real

Rama exclusiva: `atria-5.0-core-rebuild-experimental`. Continúa C2.c certificado en `feeab5a8a0af356f83884f56e15139a7b49d0c3a`, documentación `7b2f39eee8b8b93ec98aa454d4662f6b8498a496`. **Certificado:** código final `9c480eaba4ae72cc60de2f1833f3421f8fbf3e9a`, [CI V5 4/4](https://github.com/javierdario48-star/ATRIA/actions/runs/39090491746), [censo V4 4/4](https://github.com/javierdario48-star/ATRIA/actions/runs/39090491758), [preview del mismo SHA](https://night-shift-clinical-263ttw7a7-javierdario4878-7324.vercel.app/) READY/HTTP200 y 109 hashes de manifiesto iguales al build local. [Certificación estructurada](../evidence/c3a/verification.json).

## Implementación

**PERI-SEC-001 tiene ejecutor clínico conectado.** Se recuperaron su perfil de entrevista y hallazgos ns421 exactos, anamnesis/antecedentes/alergias originales, exploración por región, signos, monitor, estudios originales, medicaciones por enfermería física, consulta quirúrgica, reevaluación, destino, calidad y XP único.

`acute-care.js` extrae el circuito existente de APP sin duplicarlo: observaciones, diálogo, exploración, IV compartida, consulta, preparación/recibos, reevaluación, finalización y ledger de XP. `app-care.js` conserva su snapshot, fisiología, reglas de cierre, NPO y mensajes como política. `peritonitis-care.js` proporciona otra política al **mismo ejecutor**. CIRR mantiene su política ya validada; sólo se instancia el propietario correspondiente al paciente. No se reconstruyen mapa, sprites, movimiento, chat, teclado ni ventanas.

`native-peritonitis.js` es el único escritor nuevo de estado fisiológico y signos de PERI-SEC. Consume `sepsis-physiology-487-core.js` ya extraído y aplica las transiciones inmediatas originales únicamente tras el recibo verdadero del ejecutor IV. Recupera volumen efectivo, inflamación, SVR, contractilidad, oxigenación, reserva/estrés renal, dosis/rampa de cobertura y las funciones puras originales `csSecondaryBridgePhysiology487` / `csCriticalRescuePhysiology487`. Los recibos V5 se adaptan a sus timestamps nativos, incluyendo el campo temporal que usa el soporte reciente. No se instala B1 ni el motor general experimental que falla históricamente con heparina.

La integración nativa conserva pasos de hasta 1/60 s, subdivididos por el reloj autorizado ante frames largos. Preparación y consulta se resuelven en sus deadlines reales; el tiempo farmacológico conserva `.12/.03` minuto nativo por segundo real. El contador neurológico usa los incrementos originales `.12/.24` por segundo según hipoperfusión/recuperación. No se multiplica globalmente el reloj visible, que continúa 1 minuto real=1 hora de guardia.

Antibiótico pendiente no proporciona cobertura. Una alergia grave conocida permite ejecutar la orden, puede causar la reacción original, no concede cobertura apropiada y llega a historia/chat/calidad. La perfusión puede responder al soporte mientras persiste inflamación/foco no controlado; no se inventa curación por antibiótico. Furosemida realmente administrada empeora volumen, presión y reserva renal en hipovolemia; la decisión también se registra en el debrief mediante la penalización contextual V5 ya existente. No se crea otro sistema de toxicidad.

## Consulta, mínimos y calidad son distintos

La consulta reutiliza `csSurgicalReview487`: sospecha inespecífica o ausente se rechaza; shock con sospecha específica puede permitir evaluación urgente aun con examen pendiente. Esa aceptación no acredita el examen ni las medicaciones y no concede XP.

La derivación utiliza **csPeritonitisEvaluate487**, nunca el checklist de APP/CIRR. Una urgencia secundaria documentada puede suplir la imagen y diferir historia; no se espera un cultivo o una TC electiva para autorizar un traslado urgente justificado. Destino incorrecto se rechaza. Una tarea física o administración/consulta todavía pendiente mantiene el pase pendiente. La opción ofrecida es Quirófano y aparece junto al paciente por la UI D1 existente.

La entrega no realiza una cirugía: `sourceControlled` continúa **false**, no existe dosis ficticia `source_control`, el caso finaliza y se paga una vez. El informe aclara que el control definitivo del foco se difiere al receptor, sin presentarlo como una obligación incumplida en el box.

Se extrajeron para comparación los pesos numéricos V19 efectivos y la corrección posterior de peritonitis. El antiguo harness reducido de outcome tenía un `csBreakdown` vacío: servía para verificar finalización/XP, **no** para certificar calidad graduada. El nuevo bot instala el bloque V19 verdadero y su wrapper original en la VM de QA y ejecuta también el finalizador/carrera reales, sin alterar fuentes históricas.

| Atención / evidencia | Calidad original y V5 | XP original y V5, Solitario de práctica |
| --- | --- | --- |
| Urgencia mínima, historia diferida, sin reevaluación | 84 | 115 |
| Mínima con anamnesis y reevaluación | 87 | 118 |
| Historia pertinente completa, tres estudios y reevaluación | 95 | 128 |
| Mismo recorrido más un estudio superfluo | 94 | 126 |
| Alternativa piptazo, calidad V19 heredada | 90 | 122 |

Se conserva el crédito mínimo original por entrega segura. Ese piso numérico no es un umbral de autorización: los mínimos los decide el evaluador clínico. La fórmula de calidad de peritonitis descuenta un punto de eficiencia por estudio ajeno, distinta de los dos puntos del evaluador de los otros diez casos. El debrief representa ambas sin otra fórmula de XP. La alternativa piptazo cierra y tiene cobertura fisiológica real; su diferencia numérica heredada en seguridad/técnica se conserva explícitamente, sin falsificar ceftriaxona/metronidazol para subir la nota.

## Evidencia reproducible local y de CI

- **408/408 V5**, 40/40 core; builds V5/core; frontera de 69 módulos, un RAF y ningún temporizador/patcher nuevo.
- [Fisiología comparada](../evidence/c3a/peritonitis-native-parity.json): **12 recorridos ×13 tiempos =156 observaciones** del ejecutable efectivo original. Abandono, Ringer 500/1000/2000/6000 ml, antibióticos de referencia/piptazo/cobertura incompleta, noradrenalina, albúmina, furosemida, soporte con respuesta quirúrgica. Error máximo de signos **6.54e−12**, estado **2.06e−13**. Incluye ambos lados de los deadlines de medicación y consulta y los 31 hashes de fuentes originales. La referencia y V5 se observan en los mismos cortes de integración Euler; no se rebajaron las tolerancias para obtener verde.
- [Calidad y XP](../evidence/c3a/peritonitis-quality-parity.json): los cinco escenarios de la tabla ejecutan el cálculo V19, corrección peritonitis y carrera originales. V5 obtiene entrevista, examen, estudios, medicaciones y consulta reales; el lado V4 declara sus precondiciones diagnósticas/de estudios/consulta de fixture. No se afirma transporte de estudios antiguo desde esa VM.
- Entrevista: **30 comparaciones** en tres perfiles. Exploración: **60 comparaciones** de técnicas/estados en los tres casos. Cirugía: **10 escenarios** de rechazo/urgencia/aceptación APP/CIRR/PERI-SEC.
- Siete pruebas PERI de sesión/autoridad incluyen orden pendiente sin volumen, cierre único, urgencia sin falso examen/operación, abandono y muerte tras gracia, frames largos/cortos, diuresis perjudicial con soporte posterior, vía/monitor/cinco dosis con enfermería espacial y alergia grave conocida administrada con hipotensión/hipoxemia y pérdida de cobertura.
- `qa/v5/peritonitis-browser.mjs` recorre los controles públicos en escritorio y Pixel: caminar, DX flotante, Cirugía urgente, tratamiento combinado con siete tareas físicas, historia/examen/estudios, reevaluación, Quirófano y persistencia de XP. **Los dos recorridos pasaron en la CI del SHA final:**95/100, 128 XP, cinco administraciones reales, consulta aceptada, tres estudios completados y persistencia tras recarga. [Recibos y resultados](../evidence/c3a/peritonitis-browser.json); [capturas y logs](https://github.com/javierdario48-star/ATRIA/actions/runs/39090491746/artifacts/12123250222). APP/CIRR conservan 100/100 y 133 XP; todos los pasos anteriores de interfaz y HTTP 2/3/4 también pasaron. **Pixel es emulación; Android físico no probado.**

## Correcciones y fronteras

Los dos primeros candidatos fallaron únicamente en el bot nuevo: primero buscaba el rótulo en minúsculas cuando el catálogo original usa «Peritonitis secundaria»; después solicitaba aceptación urgente sin medir los signos. Se corrigieron el selector y la medición por el botón público existente. No se cambiaron los evaluadores ni se rebajó una aserción clínica; la última CI pasó completa.

También se corrigió un booleano erróneo en la evidencia C2.c: decía `entireManifestEqualToLocalBuild:false` pese a la certificación textual. Se reconstruyó `feeab5a` desde un archivo Git aislado y se comparó el JSON completo con su preview inmutable: 103 entradas idénticas. La evidencia ahora conserva ese método y la fecha de reverificación.

La comparación auténtica reprodujo otro error V5 previo: furosemida esperaba 1.5 s, mientras V19 administra a **0.55 s** en APP/CIRR/PERI. Se corrigió el registro compartido y las expectativas temporales del test, conservando sus aserciones de dosis, ausencia de efecto pendiente, daño y rescate. La comparativa nueva falla a 0.56 s con el valor previo y pasa con el tiempo original.

El comportamiento de soporte sigue siendo el del simulador original típico: no se certifica dosificación humana, variantes aleatorias V3, PK completa ni interacciones de las 30 entradas. En PERI el oxígeno conserva la respuesta objetivo nativa sencilla; APP/CIRR mantienen su respuesta V5 ya validada. No se extiende la fisiología séptica a otros casos.

**Siguiente checkpoint: PBE y después peritonitis terciaria.** Reutilizar el ejecutor compartido y el propietario longitudinal; añadir la convalecencia original ns423 y la confusión inicial reversible ns421, paracentesis/diagnóstico PBE y respuesta real del receptor UTI/Cirugía para terciaria. No exigir cultivo tardío ni procedimientos realizados para cerrar. Los otros ocho casos siguen sin ejecutor clínico completo; no se agregaron casos nuevos. Las dos discrepancias del bot histórico de diuréticos permanecen identificadas en el código antiguo inalterado; la respuesta perjudicial PERI V5 se prueba expresamente, sin prometer resuelto CHOLANG ni todas las exposiciones tardías saturadas por límites de signos.

El producto multijugador clínico, lobby social completo, reconexión/WebRTC y C6 siguen pendientes. Los tests HTTP/autoridad 2/3/4 clientes no certifican por sí solos guardias clínicas multijugador jugables.

Antes de implementar PBE se comprobó en el ejecutable nativo que ceftriaxona+albúmina recuperan perfusión/volumen y protegen riñón frente a abandono o ceftriaxona sola; amikacina perjudica la reserva renal. Esa lectura dirigida no es una migración. Convalecencia exige cobertura >= .8, rampa completa, inflamación <= 70% basal y soporte suficiente. La confusión PBE inicial (Glasgow14) mejora sólo si inflamación < 80% basal y PAS >= 100. Su `sourceControlled:true` inicial significa que no requiere foco quirúrgico; nunca documentar una operación ficticia. La VM fisiológica comparativa conserva su límite previo a muerte; no reemplazar su guard de finalización por un stub para certificar supervivencia.
