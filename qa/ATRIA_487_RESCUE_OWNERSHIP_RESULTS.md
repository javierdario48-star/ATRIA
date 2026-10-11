# ATRIA 4.8.7 — Rescate finito y frontera de responsabilidad de Ringer

Fecha: 2026-10-11. Rama exclusiva: `atria-4.8.7-grace-nursing-qa`.

## Checkpoint R1 — Corrección del predicado final de rescate

HEAD inicial verificado: `c04b81481b9a385cf3f812c5147677360cad00f7`. Sin commits posteriores; Architecture CI [38142968171](https://github.com/javierdario48-star/ATRIA/actions/runs/38142968171) SUCCESS. Se leyeron los resultados de transición y los checkpoints existentes. El observador CP1 y los contratos v2 se conservan; no se reconstruye B1.

**Regresión comprobada:** el HTML integrado ejecuta `ns423-evolution` después de gracia y rescate. Su asignación final `csDeathRescueMissing=function(){return true;}` evita iniciar/consultar la ventana crítica. La gracia inicial funciona por un gate separado en la transición irreversible, pero no reemplaza la ventana de rescate ante deterioro posterior.

**Corrección acotada:** el adaptador de rescate existente expone su mismo predicado crítico y sustituye únicamente esa asignación final al construir el HTML. Durante la ventana, devuelve false; agotada o sin soporte confirmado, devuelve true. No se restaura el predicado nativo antiguo, que podía conceder inmunidad permanente por una marca de fluidos. No hay otro clock, wrapper fisiológico, bonificación ni nueva política. El mismo avance del clock se ubica en la entrada fatal nativa, para que también lo ejecuten los pacientes en espera procesados por el callback cacheado de V19. El tick externo sólo lo hace en fixtures sin esa entrada; el seleccionado no cuenta doble. Esta segunda regresión también fue reproducida RED→GREEN.

- Ventana:65 segundos activos, inicio único ante signos fatales y soporte realmente documentado. Nuevas dosis, recuperación transitoria y recaída no reinician el timestamp.
- Gracia:180 segundos mínimos y hasta480 según crédito ya existente, clocks activo/físico, bank monotónico y límite irreversible sin modificaciones.
- Ambas ventanas pueden solaparse. No se suman65 segundos al deadline de gracia. Un rescate iniciado tempranamente puede vencer antes de la gracia; uno iniciado después protege por su propia duración finita.
- Dosis, volumen, antibióticos, oxígeno, inflamación, rescate hemodinámico y condiciones quirúrgicas no cambian en este checkpoint. No se administra ni controla el foco desde el predicado.

## Pruebas R1 y límites

`src/integration/critical-rescue-live-487.test.js` compila los fragmentos clínicos actuales del HTML generado en su orden real y usa el flujo nativo de enfermería y sus callbacks. El RED anterior a la reparación falla exactamente porque el predicado final devuelve true después de la administración. Los seis bots posteriores comprueban administración pendiente/real, repetición sin renovación, vencimiento65s, muerte tras shock persistente, gracia inicial, solapamiento, recuperación/recaída y aislamiento de pacientes, incluidos cambio de box y primer rescate iniciado en segundo plano. Un paciente fallecido deja de acumular clock.

Los signos observados refractarios se fuerzan en un fixture declarado para aislar la política, conservando el cálculo fisiológico, evidencia, clocks y transición fatal nativos. Sólo el cierre visual/XP es un stub. No es una prueba de navegador completo ni Android físico ni validación clínica del tratamiento.

Los snapshots nativos/B1 aprobados **no se regeneran**. La comparación admite exclusivamente tres revisiones de fuentes pinneadas y cuatro muestras de daño fatal que pasan de un tick0,002 a0 al funcionar la ventana. Todos los signos, variables fisiológicas, dosis, tiempos y demás números se comparan con las referencias originales. El inventario30/13 conserva contenido; sus tres huellas cambiadas se verifican explícitamente.

El gate de artefacto revierte en memoria exactamente la asignación reparada y el script de rescate reemplazado, pinneando el texto anterior por SHA256. Después exige el hash protegido original `dc59039a59220582a1f5c86fcd8a2a0227c1cd3868550ba34a290049b94ef9c7`. No se acepta un nuevo hash global que esconda cambios ajenos. HTML reparado: `08b6d905f3d3b49a7905d28ce57cc53fce13b2576d71c173f8ca8864959ab0d7`;71 scripts inline,11 copias golden intactas,10 módulos QA82.544bytes.

Regresiones locales verificadas, todas exit0: tests específicos, suite completa, runner existente24 trayectorias/216 comparaciones ON/OFF, build y verificación de artefacto. Revisión independiente detectó la congelación del clock en segundo plano; la prueba RED y la corrección quedaron incluidas. La publicación exacta y su CI se verifican antes de comenzar R2; no se presupone que un HEAD nuevo sea verde.

Medición nueva del runner existente, Node/Linux:600 ticks/1paciente/5tratamientos, p95 nativo0,210ms y sombra0,276ms. Heap total del proceso26.336.456bytes, RSS285.954.048bytes; incluye VMs y resultados, no memoria incremental del motor ni medición Android.

## Responsabilidad hasta comenzar R2

Ringer sigue siendo nativo: bolo/V3, aporte crítico, balance del puente y seguridad por volumen acumulado. La evolución natural y convalecencia también escriben volumen, con causas diferentes. B1 sigue en sombra, OFF por defecto. Historial y evidencia no se filtran ni borran. La separación de aportes farmacológicos se hará sólo después del CI de R1, preservando la elegibilidad y tiempos de rescate/gracia/consulta/pase.

Heparina continúa sin modelar y bloquea el arranque farmacológico global. Ningún otro medicamento se incorpora. Producción, ramas protegidas, vendor, Supabase, XP, cirugía y multijugador no se modifican.

Rollback R1: revertir el commit entero restaura los bytes previos y su comportamiento conocido; no es una recomendación de volver a desactivar el rescate. No modificar el dueño de un paciente activo ni restituir su fisiología por un toggle. La fase R2 debe definir primero la admisión/versiones por paciente y un rollback seguro de futuras admisiones.

## Cierre R1 verificado

Publicado `01a43d49452119cc19566e008656485429bf2534`, árbol `4a9be6e72545650bb01252c5bde2e56bc1a14094`, parent único c04b814. Architecture CI [38145326302](https://github.com/javierdario48-star/ATRIA/actions/runs/38145326302) SUCCESS, todas las etapas del job 114487350246 completadas; artefacto 11704491773 vinculado al SHA, 1.116.393 bytes. No se descargó su ZIP remoto. R2 comenzó únicamente después de verificar ese CI.

La sección de responsabilidades anterior describe el estado histórico al cerrar R1. La transferencia experimental posterior, su propietario por paciente y sus límites están en [ATRIA_487_RINGER_OWNERSHIP_RESULTS.md](ATRIA_487_RINGER_OWNERSHIP_RESULTS.md). R1 continúa siendo el checkpoint de rollback que conserva el rescate reparado.
