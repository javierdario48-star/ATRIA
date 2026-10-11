# ATRIA 4.8.7 — Ringer: un responsable por mecanismo en QA

Fecha: 2026-10-11. Única rama: `atria-4.8.7-grace-nursing-qa`.

## Recuperación y separación de checkpoints

HEAD inicial remoto: `c04b81481b9a385cf3f812c5147677360cad00f7`; no commits posteriores al iniciar. CI inicial completo [38142968171](https://github.com/javierdario48-star/ATRIA/actions/runs/38142968171) SUCCESS. Se leyeron los dos documentos obligatorios y se reutilizó la auditoría existente.

**R1 se publicó y verificó antes de desarrollar esta activación:** `01a43d49452119cc19566e008656485429bf2534`, árbol `4a9be6e72545650bb01252c5bde2e56bc1a14094`, parent único `c04b81481b9a385cf3f812c5147677360cad00f7`. Architecture CI [38145326302](https://github.com/javierdario48-star/ATRIA/actions/runs/38145326302) SUCCESS; job 114487350246, todas las etapas completas. Artefacto 11704491773, 1.116.393 bytes, vinculado a ese SHA, no expirado. Se verificó metadata remota y contenido local; no se descargó el ZIP remoto.

R1 conserva la ventana de **65 segundos activos**, inicio único, sin renovación por readministrar ni por recuperación/recaída. El predicado final de `ns423` usa la ventana finita y luego permite el deterioro fatal. La gracia sigue siendo 180–480 s según su política original. El mismo reloj también avanza en el paciente en espera, sin contar doble el seleccionado. Véase [ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md](ATRIA_487_RESCUE_OWNERSHIP_RESULTS.md).

**R2 publicado y verificado:** `57d2cbbe25455bd095c628640c4f9082a07cbba9`, árbol `520335fcf3790236302f8d0fffb5e1e9057467d7`, parent único R1. Architecture CI [38151320102](https://github.com/javierdario48-star/ATRIA/actions/runs/38151320102) SUCCESS, todas las etapas del job 114505204409. El árbol remoto coincide exactamente con el probado. Los logs del CI confirman 13 controles de propietario, 17 bots integrados, 24 trayectorias/216 comparaciones de sombra y HTML SHA-256 `92902694a148f8a52fcdb1837e9558651a9f17c037d07887090927d9293aa9fd`.

Artefacto remoto 11706418477, 1.122.541 bytes, no expirado, ligado a ese SHA; digest del ZIP en metadata `sha256:f21ae5cde46901cda91a27a59a3d24d94fe7c32299c35765c0ee0c2697a7130d`. Se verificaron metadata y logs de contenido del CI, sin descargar su ZIP. El siguiente commit sólo documenta este cierre; su propio SHA/CI se verifican al entregar. No existe un despliegue o promoción de producción.

## Implementación mínima

No hay otro integrador. `src/integration/physiology-ringer-owner-487.js` invoca el mecanismo registrado B1 `volume` únicamente en su fase `receipt`, con los parámetros aprobados de la formulación existente `fluid`/`balanced-crystalloid`. No ejecuta `stepPhysiology` con tiempo positivo sobre el paciente real, porque eso duplicaría infección, pérdidas, tono, bomba y riñón.

El estado adicional contiene circulación derivada del volumen nativo, líquido intersticial atribuido a dosis confirmadas, total recibido y riesgo de sobrecarga. El incremento circulante se proyecta a `sim.phys.effectiveVolume` mediante el mismo volumen euvolémico del perfil B1. La presión/FC siguen derivándose por `progressionOffsets` nativo. La FR/SpO₂ incorporan una sola contribución de sobrecarga, derivada del riesgo B1; sus fórmulas se extraen y reutilizan sin modificar coeficientes ni snapshots B1.

El delta de un bolo de 500 ml es 125 ml circulantes y 375 ml intersticiales en la simplificación existente. Con el perfil de 5000 ml, el incremento normalizado es 0,025. **Es calibración educativa B1, no un reparto clínico medido ni una dosis recomendada.** No se copian las bonificaciones antiguas para obtener paridad numérica.

## Mapa de responsables

| Aporte/consumidor | Por defecto y modo sombra | Admisión experimental Ringer |
|---|---|---|
| Reconocimiento, IV, preparación de 800 ms, administración e historial | Enfermería/ejecutor nativos | Mismo ejecutor; adaptadores verifican identidad/vía antes del parser, cola y completion |
| Bolo y reescalado V3 de volumen | Cadena nativa completa | B1 `volume.receipt`; se evita toda la cadena inmediata antigua para este bolo |
| Incremento de volumen del rescate crítico | `csCriticalRescuePhysiology487` | Sólo ese incremento está excluido; sus aportes de O₂/pressor se conservan |
| Puente: compensación del 60% de pérdida + balance añadido | Puente nativo | Se excluye todo el bloque de volumen, incluida compensación de pérdida |
| Puente: inflamación, tono y bomba del paquete de cuidados | Puente nativo | Puente nativo; no hay mecanismo B1 de tono/bomba activo en esta migración |
| Sobrecarga por total de fluidos: FR/SpO₂/PA fijas | `medicationSafetyOffsets` | Rama excluida; riesgo de sobrecarga B1→FR/SpO₂, sin bono arbitrario de PA |
| Pérdidas naturales, infección, riñón y estado inicial | Fisiología nativa | Fisiología nativa; los efectos contextuales de leer otro volumen son reales |
| Convalecencia `ns423`, tras control real del foco y cobertura | Evolución nativa | Evolución nativa; no se reclasifica como otro bolo de Ringer |
| Suavizado, límites y escritura del monitor | `updateLiveVitals` nativo | Mismo escritor y ritmo |
| Evidencia de rescate, gracia, consulta y derivación | Consumidores nativos de registros reales | Mismos registros y condiciones; ningún recibo se filtra o borra |
| Ventana de 65 s, gracia de 180–480 s, exposición fatal y muerte | Políticas nativas reparadas en R1 | Mismas políticas; se prueban también con el volumen nuevo |
| Cirugía/derivación/XP/multijugador | Sistemas existentes | Sin cambios de código o política |

La titularidad se define por **mecanismo causal**, no por prohibir que una enfermedad también cambie el volumen. El paquete antiguo de cuidado séptico sigue condicionando inflamación/tono/bomba; no se presenta como una farmacología validada de Ringer. Migrar futuros vasopresores exigirá auditar esa frontera antes de activar otro mecanismo.

## Contratos de ejecución

- Sólo órdenes que nombran **Ringer**, con acceso venoso confirmado y dosis positiva en ml. La vía IV omitida en el texto se completa prospectivamente conforme al ejecutor IV existente; esto preserva las órdenes nativas del tutor `Ringer 500 ml`.
- No se transforma retrospectivamente una fila CP1/v1 en v2. No se atribuyen suero salino, cristaloides genéricos o expansión sin identificar a una formulación de Ringer. Deben reformularse en esta prueba acotada.
- La comprobación del texto original precede al parser porque éste interpreta `vía desconocida` como otro procedimiento y descarta el calificador del fármaco. Se reutilizan el scanner de enfermería y el calificador de vías ya existentes; la enfermería normal sólo se envuelve durante esta admisión experimental.
- Vías incompatibles/desconocidas, dosis cero/negativa, infusión, ml/h, duración (`en 30 minutos`) e intervalo (`cada 6 horas`), titulación y suspensión de un bolo se rechazan antes de preparar/registrar. Los contratos v2 existentes de start/setRate/stop siguen disponibles para formulaciones continuas; **no se implementa un ejecutor nuevo de infusiones** aquí. Repetir otra dosis de Ringer crea otro bolo completo; no modifica ni elimina exposición ya entregada.
- En completion se conserva la autorización nativa `nsMayContinueTreatment`. Un guard adicional exclusivo de fluidos evita una entrega experimental si cambió contexto/identidad/endpoint durante los 800 ms; elimina la preparación sin inventar un registro. Los demás tratamientos conservan su callback.
- El ingreso nativo clona el caso para sus datos demográficos; el enlace de completion selecciona temporalmente el caso canónico. Se acepta esa representación por ID y definición fisiológica fijada al ingreso. Cambiar la definición bloquea nuevas dosis y nunca devuelve el aporte a los escritores antiguos. La identidad del paciente permanece fijada.
- La instalación rechaza colas Phase4, recibos previos de enfermería y tareas/cola activa de enfermería, además de tratamientos previos. No puede ascender una orden anterior cuyo texto original ya fue descartado a un recibo estricto nuevo. El rechazo deja intactos los registros y la evolución nativa de ese paciente.
- El objeto ejecutado declara formulación, revisión, fingerprint, IV y bolo antes del registro nativo. Después se verifican fila, contador, minuto y dosis; se genera el evento estricto v2 y su evidencia de completion. El recibo registra paciente, secuencia, episodio independiente y timestamp del reloj clínico existente. Los IDs vistos impiden aplicar otra vez el mismo bolo.

Esto acredita la ejecución del **simulador**. No prueba administración física ni mezcla segura en una misma vía, y no reconstruye datos ausentes de historiales anteriores.

## Activación y rollback

El HTML experimental define la API sin importar módulos ni instalar writers. CP1 sigue disponible en sombra; el motor antiguo controla el juego por defecto. Sombra y propietario clínico no se activan simultáneamente.

```js
// Exclusivamente en la QA experimental: preparar antes de seleccionar paciente.
await window.csPhysiologyQA487.armRinger();
// Seleccionar una nueva atención local PERI-SEC-001, fuera de una guardia activa.
window.csPhysiologyQA487.reportRinger();
// Cancelar la preparación, o restaurar referencias una vez finalizado el caso.
window.csPhysiologyQA487.rollbackRinger();
```

La preparación carga el módulo **antes** de la siguiente admisión y usa el `startCase` real, después de que éste crea el paciente. Es una sola admisión: otra patología, modo compartido, paciente oculto, tratamientos previos/pendientes o guardia activa quedan bloqueados sin modificar su motor nativo. `enableRinger()` directo también valida una admisión todavía en minuto 0 y fija paciente/UID/caso a través de la importación asíncrona.

El responsable y la revisión se fijan durante toda la atención. Un cambio posterior de contexto, UID o endpoints bloquea dosis nuevas sin devolver aportes a los escritores antiguos. `rollbackRinger()` **rechaza** migrar un paciente activo, incluso si recibió una dosis en minuto 0; después del cierre restaura exactamente las seis referencias. `disable()` detiene el observador/cancela una preparación, pero no revierte físicamente un bolo ya entregado.

El reloj determinista existente mantiene sus segmentos de ritmo 0,12/0,03 sin cambiar el ritmo nativo. Llegar al límite de 128 segmentos produce diagnóstico y bloqueo de nuevas dosis; no lanza un error sobre la actualización clínica ni cambia propietario. Falta un replay/versionado validado para migración durante una atención; no se disimula con un toggle.

## Bots y regresiones

- 13 pruebas de titularidad: pendiente, dosis real única, deduplicación, repetición, sobrecarga, trayectoria sin Ringer, rechazo previo, texto original, combinación, contexto alterado, cancelación durante preparación, discontinuidad de caso sin fallback nativo, rescate sin vía textual y rollback.
- 17 bots del HTML clínico/enfermería generado: admisión limitada, caso clonado/enlace canónico, rechazo de colas anteriores sin mutarlas, duración/intervalo no soportados, carrera de importación, preparación/cancelación, exclusión de sombra, igualdad de los otros cuatro B1, hipovolemia/dosis insuficiente, exceso, puente, consulta aceptada y destino nativo, rescate de 65 s, gracia/muerte tardía, rollback exacto, determinismo/timestep/typing y límite de reloj.
- Los seis bots integrados de rescate R1 se conservan, incluido segundo plano. Suite completa `npm test` exit 0. Se conserva B1, sus 30.351 comparaciones numéricas y la validación de catálogo/13 casos. No se regeneran expectativas aprobadas.
- Runner CP1 `npm run qa:physiology-live` exit 0: 24 trayectorias y 216 comparaciones de estado completo ON/OFF, incluidos Maps/Sets. Build y `npm run qa:physiology-artifact` exit 0.
- El artefacto exige los bytes actuales de cada adaptador y revierte **únicamente** los parches autorizados en memoria antes de exigir el hash previo protegido `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`. No se sustituye a ciegas el hash global. 71 scripts inline, 11 externos golden idénticos y 11 módulos QA offline, 95.839 bytes en esta medición.

Los tests de política fuerzan signos observados de shock refractario mientras ejecutan fisiología/evidencia/clocks/exposición fatal nativos. El cierre visual/XP es stub. La admisión visual se sustituye sólo en el bot de preparación; la API del HTML real apunta a `startCase`. No hay aceptación de navegador completo ni dispositivo físico.

La revisión independiente reprodujo cuatro fallos de integración: igualdad incorrecta del objeto de caso durante el enlace canónico, activación sobre una cola previa, duración/intervalo tratados como bolo y discontinuidad de caso que devolvía el volumen al rescate antiguo. Los cuatro se corrigieron y tienen pruebas de regresión. El responsable numérico se fija al paciente; el caso y el contexto se verifican antes de administrar. Un paciente diferente conserva el comportamiento nativo.

**Recuperación del checkpoint:** en una copia temporal exportada del R1 verificado se aplicó el parche completo R2 y se revirtió. Coincidieron los 213 archivos y sus SHA-256, incluidos los archivos nuevos eliminados por el revert. Sobre esa copia recuperada pasaron los seis bots integrados de rescate, el build y la verificación del artefacto. El HTML volvió exactamente al SHA-256 R1 `08b6d905f3d3b49a7905d28ce57cc53fce13b2576d71c173f8ca8864959ab0d7`. No se cambió de versión al paciente activo ni se usó esa copia como base de desarrollo.

## Resultados y discrepancias que se conservan visibles

Con volumen inicial 0,45, sin control de foco:

| Tiempo real | Sin Ringer: volumen/PA sistólica | Ringer 50 ml B1 | Ringer 500 ml B1 | Ringer 500 ml antiguo |
|---|---|---|---|---|
| 10 s | 0,42190 / 70,82 | 0,42440 / 71,02 | 0,44690 / 72,81 | 0,49393 / 76,23 |
| 30 s | 0,35990 / 61,48 | 0,36240 / 61,69 | 0,38490 / 63,53 | 0,46701 / 69,89 |
| 60 s | 0,28000 / 55,00 | 0,28000 / 55,00 | 0,28000 / 55,00 | 0,36675 / 55,73 |

La respuesta nueva es menor y transitoria: no suma los refuerzos antiguos ni cura la sepsis. Las pérdidas nativas persistentes pueden llevar todos los bolos al mismo piso. Se corrigió una expectativa de test que exigía orden estricto de dosis hasta el final: el límite nativo explica esa convergencia; no se cambió fisiología para impedirla.

En estado inicial 1,05, a 30 s, 500 ml produce SpO₂ 90,18/FR 33,43; 3000 ml produce SpO₂ 83,78/FR 36,63 y riesgo 0,600. La rama antigua de toxicidad de fluidos está excluida; aumentar PA no se interpreta como resolver perfusión, infección o foco.

Con consulta y cuidados confirmados, el puente mantiene evidencia/tono/bomba y no escribe volumen. El bot ejecuta la respuesta de Cirugía y el writer nativo de destino: el paciente llega a quirófano y el caso termina, **`sourceControlled` sigue false**. No se declara una operación realizada.

En los bots refractarios, dosis repetidas no renuevan 65 s; la muerte ocurre después de agotar rescate/gracia. En el escenario temprano documentado la gracia termina a 312 s por sus créditos originales, no a 312 + 65.

## Rendimiento y límites clínicos

Node 24.19.0/Linux/x64, 1 paciente/1 tratamiento, 1200 actualizaciones después de calentamiento: mediana nativa 0,136 ms y experimental 0,143 ms; p95 nativo 0,246 ms y experimental 0,234 ms. La variación de la medición no demuestra una mejora de rendimiento. Datos adicionales serializados del propietario/reloj: 1549 bytes con una dosis. Heap del proceso 19.582.472 bytes/RSS 195.923.968 bytes incluyen VMs y módulos, **no** son RAM incremental por paciente. No render/canvas ni Android/iOS físico. Reproducible con `node --expose-gc qa/physiology-live/benchmark-ringer-487.mjs`.

La actualización visita sólo este paciente, sus mecanismos activos y el reloj acotado; no recorre 300 medicamentos. IDs vistos están limitados a 2048 y la historia nativa sigue en 80 filas.

Referencias independientes consultadas:

- [SSC 2026, SCCM](https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026): cristaloides, preferencia condicional por balanceados y reevaluación dinámica de respuesta. No avala los coeficientes B1.
- [Ficha regulatoria Ringer lactato, DailyMed, sección 5.7](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d3d29c8f-c326-4097-814a-7f4e08c67068): sobrecarga/edema pulmonar y mayor precaución en disfunción renal. No proporciona una ecuación de SpO₂ ni una fracción fija de retención para el simulador.

La circulación se lee del estado nativo dinámico, pero el compartimento intersticial es **contabilidad parcial de las dosis**, sin migrar todavía redistribución/eliminación renal B1. El riesgo puede persistir y penalizar oxigenación incluso con bolos pequeños en hipovolemia; está visible en las trayectorias. No es balance hídrico clínicamente validado. Volumen euvolémico, reparto25%, límites y coeficientes respiratorios siguen pendientes de calibración externa. Electrolitos, compatibilidad ceftriaxona/calcio en una misma línea, balance ácido-base y otras toxicidades no están modelados. No se activan otros fármacos para ocultar estas limitaciones.

El límite de dosis de 1.000.000 ml proviene del contrato informático B1 existente y sólo limita magnitudes finitas; no representa un máximo clínico aceptable ni un rango validado de administración. Falta calibrar límites de pauta contextual antes de ampliar la activación. Las pruebas de exceso muestran perjuicio y no autorizan dosis extremas.

## Protección y siguiente frontera

No se modifica main/originalQA/vendor/producción/Supabase/XP/código de cirugía/derivación/multijugador. No hay despliegue. Los parches de rescate/puente transfieren sólo contribuciones numéricas de volumen; sus funciones de evidencia, ventanas y criterios de pase se conservan. La respuesta fisiológica nueva puede cambiar un crédito que depende de respuesta **real**, o el instante de deterioro, sin que eso constituya otro crédito o una ventana nueva.

Catálogo global: 30 entradas, sin moléculas nuevas ni compatibilidad ficticia. B1 mantiene 5 formulaciones experimentales y 3 perfiles; 25 entradas siguen sin mecanismo completo. Sólo el volumen/sobrecarga de **Ringer en PERI-SEC** tiene activación local preparada. Oxígeno, noradrenalina, morfina y furosemida reales siguen con su dueño nativo; no se anuncian los cinco integrados. Heparina continúa bloqueando la transacción global.

Siguiente checkpoint: prueba del SHA exacto en navegador QA y móvil, reevaluación/calibración del riesgo distributivo de fluidos y recorrido de admisión real. Después, auditar por separado oxígeno y sus contratos de cambio/suspensión antes de ampliar B1. No avanzar a los 25 tratamientos ni activar un vasopresor sobre la frontera de tono todavía compartida.
