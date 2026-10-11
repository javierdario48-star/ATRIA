# ATRIA 4.8.7 — Checkpoint D: suspensión de oxígeno realmente ejecutada

Rama exclusiva: `atria-4.8.7-grace-nursing-qa`. HEAD inicial remoto verificado `7606e1452b0f4bc9f399e91876fac081ca20b9bc`; Architecture CI [38167853204](https://github.com/javierdario48-star/ATRIA/actions/runs/38167853204) SUCCESS, todas las etapas del job114554047804. Se incorporaron por fast-forward los doce commits posteriores a la copia de trabajo anterior y se leyeron los checkpoints A/B/C, cobertura30, Ringer, rescate y estabilización. No se reconstruyó B1 ni su auditoría.

## Cambio funcional y responsable

**Oxígeno continúa nativo.** `suspender oxígeno` / `retirar el oxígeno` explícitos, dirigidos a enfermería en QA local solo/aprendiz, ahora solicitan una tarea **en la cola de enfermería existente**. El comienzo de la tarea no modifica el soporte. El `finishNurseTask` nativo, con sus permisos/enlace al paciente, llama a la completion acotada; se comprueban UID, caso, modo local original, soporte previo, marcador pendiente y `nsMayContinueTreatment` nuevamente antes de registrar nada.

Sólo después de esa completion se registra en `administrationLog` un evento `suspension/stop`, con paciente, tiempo nativo, vía inhalada y dosis anterior. `status: administered` pertenece al protocolo de eventos ejecutados del simulador; **no representa otra dosis**. No incrementa `therapyExposure.count` ni su cantidad acumulada. El soporte activo desaparece entonces; la administración anterior no se borra. Por sus condiciones existentes de actividad, dejan de actuar tanto el aporte directo a SpO₂ como el aporte de oxigenación del rescate. No hay escritor B1 añadido, cambio de propietario ni cambio de política crítica.

Mientras el stop está pendiente, otra dosis/cambio de flujo queda bloqueado por el mismo `pendingTherapies` nativo. Una orden con inicio todavía pendiente, soporte inactivo, negación, pregunta o condición no produce una suspensión. Pérdida de permiso/identidad durante la tarea la rechaza y libera únicamente su marcador pendiente. Un nuevo inicio posterior necesita otra administración real.

El observador existente acepta el nuevo evento **capturado desde `recordAdministration`**, con sus campos explícitos de completion. No lo infiere de la frase, de eliminar el elemento visual ni de la desaparición de `monitorTherapies`. Un `stop` no cambia el contador de dosis; después puede observar un nuevo `start`, en vez de una falsa titulación de un episodio cerrado. Sigue sin mutar al paciente.

## Historial limitado y revisión

La revisión independiente y las pruebas negativas reprodujeron las siguientes carencias antes de publicación:

- Condiciones/modales anteriores o posteriores a otro elemento reconocido podían perderse y ejecutar stop. La prueba RED de «cuando termine el Ringer suspender oxígeno» y otras variantes se corrigió con reconocimiento imperativo acotado y rechazo de contexto ambiguo, sin ejecutar ese pedido.
- Tras80 filas, un oxígeno todavía activo perdía su inicio en el historial visible y no podía suspenderse. Se conserva **un recibo compacto del último inicio confirmado en la entrada `therapyExposure` ya existente**, capturado al entregar. Se valida su paciente, contador y tiempo contra el soporte activo; no se reconstruye de una marca activa.
- Al salir del historial visible, un stop podía volver a figurar pendiente. La confirmación terminal se conserva en su recibo de enfermería ya existente, limitado a32 pedidos. El cursor de confirmaciones verdes usa la última fila real, no la longitud80, para seguir notificando nuevas ejecuciones. No se añade otro registro global ni se amplían los historiales.

Un cambio de modo local a cooperativo durante la tarea rechaza la completion. Los recibos terminales siguen limitados a32 y se elimina sólo su clave redundante de deduplicación:40 ciclos de inicio/stop no dejan claves únicas de stop creciendo indefinidamente.

Los13 casos tampoco definen una intervención histórica `oxygen` que mantenga `therapyActive` falsamente activo tras el stop; el bot verifica su retirada en los trece. No se modifican los predicados protegidos para ocultar esa posibilidad.

## Evidencia clínica y límites deliberados

La [guía oficial BTS](https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/) exige controlar oxígeno hacia un objetivo de saturación; su [sección12](https://www.brit-thoracic.org.uk/document-library/guidelines/emergency-oxygen/bts-guideline-for-oxygen-use-in-adults-in-healthcare-and-emergency-settings/) describe retirada, reevaluación y reinicio si desatura. Se utiliza como expectativa cualitativa independiente, **no** para certificar los coeficientes del motor ni sus tiempos comprimidos.

Trayectorias nativas verificadas a0/0,1/1/3/10 segundos reales:

| Perfil | SpO₂ inicial | SpO₂ a10s |
|---|---:|---:|
| PERI-SEC sin oxígeno |92|91,806|
| Oxígeno0,5 L/min |92|97,776|
| Oxígeno4 L/min |92|97,776|
| Normoxemia +4 L/min |98|99,945|
| Perfil muy hipoxémico +4 L/min |76|81,776|

**Carencia conservada y visible:** las dos rutas nativas no discriminan flujo bajo de flujo habitual. La normoxemia puede acercarse a100%; no hay objetivo BTS parametrizado, CO₂/gasometría ni un estado real de shunt. Cambiar sólo la saturación basal en un fixture comprueba respuesta insuficiente; **no valida hipoxemia refractaria clínicamente modelada**. Este checkpoint cierra la suspensión, no los diez criterios de farmacología completa. La transferencia B1 sigue bloqueada por su frontera de responsabilidad y no es necesaria para entregar este avance.

## Pruebas, protecciones y rollback

`npm run qa:oxygen-functional` pasa14 grupos de pruebas y cinco perfiles temporales. Ejecuta los bots del HTML clínico/enfermería generado: pendiente/ejecutado, negación/pregunta/condición, permiso/UID, carreras de flujo, inicio/stop/reinicio, dosis no duplicada, rollover de80 filas, historia terminal, igualdad completa con observador ON/OFF, retirada temporal, combinación con Ringer, los13 casos y rescate tardío. El test de hipoxemia refractaria de política fuerza signos observados como los bots de rescate existentes; conserva fisiología/relojes/evidencia/fatalidad nativos y sólo excluye la UI de cierre/XP.

Una retirada real deja de contar como soporte activo para rescate. La gracia ya ganada sigue su política bancaria original; stop/reinicio **no renuevan65 segundos**. Se conserva la posible muerte después de rescate/gracia. Los bots B1/Ringer/consulta/derivación históricos se conservan. Ringer experimental sigue OFF por defecto, limitado a admisión nueva local PERI-SEC; rollback de propietario durante atención activa sigue rechazado.

La suite completa pasó; la comparación de sombra pasó24 trayectorias/216 puntos, junto con build y artefacto. HTML SHA-256 `cc81a631a84fa6881ecbd04999b1b2f5b115cd14d7e233be3cc5c6b155de6804`;71 scripts inline,11 externos,11 módulos QA offline; ningún escritor B1 activo por defecto. Se actualizó sólo el texto de bloqueos del preflight histórico y se ejecutó nuevamente ese bot.

Medición Node reproducible,600 ticks/paciente/5 tratamientos: p95 nativo0,253 ms, con observador0,292 ms. Heap del proceso26.567.032 bytes y RSS287.416.320 bytes incluyen VMs/resultados; **no son memoria por paciente**. Informe serializado69.538 bytes, máximo339.179; capacidades256 muestras/2.048 recibos. No extrapolar a Android físico.

Reversión completa del parche verificada en una exportación aislada del HEAD inicial: recupera los229 archivos originales, elimina los nuevos y vuelve a pasar build/artefacto, HTML previo `92902694a148f8a52fcdb1837e9558651a9f17c037d07887090927d9293aa9fd`. Esa exportación sólo valida rollback; no es una base de desarrollo histórica. El validador revierte **sólo** los tres scripts de ejecución/dispatcher/confirmación y las tres adiciones nativas autorizadas antes de exigir el hash protegido original; los snapshots numéricos B1 no se regeneran. El SHA y CI nuevos se verifican después de publicación y se informan al entregar; el CI inicial no es prueba del commit nuevo.

Rollback: revertir el commit completo para una futura carga/admisión; no recargar ni cambiar versión durante una atención activa. No se simula recuperar oxígeno ya retirado mediante restaurar referencias: reiniciarlo exige una orden administrada real.

No se modifica producción, ramas protegidas, golden master, rescate/supervivencia, Cirugía/derivación, XP, multijugador, Supabase o micrófono. No hay despliegue, navegador completo ni Android/iOS físico. Heparina sigue bloqueada. Siguiente checkpoint de valor: contratos reales de noradrenalina y titulación/suspensión confirmadas, conservando nativo/sombra si la frontera no permite transferir responsabilidad sin tocar política protegida.
