# C2.b — Morfina efectiva 4.8.7, administración y evolución

Base funcional: `833c8bc0a3f8dc45ce103de7e614bb4dd01e0c54`, C2.a con CI4/4 y censo F/G/I aprobados. Única rama: `atria-5.0-core-rebuild-experimental`. Ningún cambio a V4, main, wrappers históricos ni golden master.

## Cambio ejecutable

`morphine-487.js` extrae la función final efectiva de `src/integration/morphine-487.js` sin importar su wrapper al runtime. El validador es idéntico al original (comparación de `toString` en QA): dosis IV positiva hasta30mg, referencia4mg; conserva aclaración ante vía/unidad/cifras ambiguas. Una dosis12mg técnicamente válida se ejecuta aun siendo perjudicial. Las dosis son calibración educativa del juego.

El mismo `createIVAdministration` prepara morfina durante0.55 segundos reales, medidos en V4, tras acceso venoso y llegada física de enfermería. El nuevo dispatcher `parseIVMedicineDose` se comparte entre preflight compuesto, planificación de vía, llegada y ejecución. No hay motor de administración adicional. Una retransmisión del mismo evento no redosifica; una nueva receta sí.

La respuesta se deriva del historial de recibos auténticos, con tratamiento coincidente, UID, dosis, unidad, tiempo e identidad única. Conserva exactamente el mecanismo original: dosis recientes24, ventana40min nativos, semivida nativa `8*(1+.28*(1-reservaRenal))`, carga limitada3.6, analgesia por caso y depresión respiratoria/hemodinámica según signos actuales. No conserva la toxicidad acumulativa permanente del escritor antiguo reemplazado. La historia completa de dosis permanece.

APP/CIRR siguen como únicos escritores de signos vitales. Añaden una sola vez los offsets puros de morfina; el catálogo marca todos sus ejes como propios y devuelve cero candidatos duplicados. El índice virtual de dolor conserva el coeficiente original .65, usando la analgesia actual en vez de fuerza indefinida. No crea una escala de dolor medida. El reloj visible mantiene1min real=1h de guardia y la cinética usa exclusivamente `nativeMinute`, incluida la escala al escribir.

Una complicación opioide requiere riesgo respiratorio original **y** un efecto modelado sobre el eje alterado observado (FR<12 o SpO2<94). Hipoxemia previa por líquidos sin efecto opioide sobre SpO2 no basta. El indicador documental es binario y no agrega una ecuación de toxicidad. Historia, chat global y calidad reciben el mismo evento, conservado al resolverse. El estado se resuelve al desaparecer el riesgo original; el oxígeno no borra la exposición ni la complicación. La autoridad admite explícitamente este tipo de evento y lo serializa tras su administración.

El soporte y la mortalidad reutilizan el único propietario de supervivencia existente: sin muerte instantánea ni inmunidad permanente. En el escenario comprobado,6L reales dejan al CIRR vivo conSpO2=84.48 después del período máximo de gracia; añadir12mg produce hipoxemia crítica sostenida. Sin soporte fallece después de13.75s desde la indicación, nunca por un flag inmediato. Oxígeno temprano confirmado permite estabilizar la saturación; tardío se rechaza después del fallecimiento. No se inventó naloxona ni se afirma un protocolo clínico completo de sobredosis.

## Verificación reproducible

- `morphine-487.test.js`:13 casos contra el ejecutable generado V4 tras dosis real, repetición y decaimiento; igualdad de todas las ecuaciones con tolerancia1e-11. Reserva renal y vulnerabilidad actual; límite24 con30 administraciones reales; recibos falsos, futuros, duplicados, ajenos o discrepantes rechazados.
- `morphine-execution.test.js`: Solitario/Aprendiz×APP/CIRR, preparación sin efecto previo,12mg con daño medible, oxígeno real, documentación/aviso/penalización persistentes, redosis/replay, eliminación, reloj nativo al escribir y sourceEventId compuesto largo. Seis recorridos de soporte temprano/tardío/ausente con muerte y0XP cuando corresponde. Trayectorias V4/V5 a1/15/30/110s difieren menos de0.05 en cada signo, aun avanzando frames largos.
- `physical-nursing.test.js`: orden compuesta monitor+morfina12mg crea la vía automáticamente y completa tres viajes legítimos, un recibo de medicación y ningún redosificado al retransmitir. La prueba de intervención no migrada usa ahora vasopresor; se conserva además el rechazo de morfina oral. No se elimina el control all-or-nothing.
- `qa/v5/morphine-browser.mjs`: cuatro escenarios de módulos publicados, enfermería espacial, monitor,12mg, daño, aviso global y soporte con oxígeno en escritorio/Pixel emulado×Solitario/Aprendiz. CI conserva toda la batería previa.

Las pruebas RED reprodujeron la ausencia de administración, el aviso global descartado por la allowlist y la atribución incorrecta de hipoxemia previa. Todos se corrigen antes de publicar. QA de V4 se usa únicamente en tests, jamás dentro del runtime V5.

## Validación local de publicación

`npm run test:v5`:372/372; `npm run test:v5-core`:40/40. Ambos builds y boundary gate aprobados; juego97archivos y core14módulos. `npm test` completo aprobado, incluidas421 combinaciones de enfermería,131 cierres y39 escenarios perjudiciales. Las dos discrepancias antiguas de diuréticos se mantienen identificadas. SHA funcional `4a726fb6f80ec1976e5a7c667778673834e56024`: [CI V5 4/4 aprobada](https://github.com/javierdario48-star/ATRIA/actions/runs/39066451369), [censo F/G/I aprobado](https://github.com/javierdario48-star/ATRIA/actions/runs/39066451418). [Preview HTTP200,97/97 hashes](https://night-shift-clinical-4q3x6l3fp-javierdario4878-7324.vercel.app). Cuatro escenarios de morfina en navegador: SpO2=88.396→91.886 con soporte real; una complicación y5puntos de penalización; todos los viajes confirmados. Evidencia `docs/evidence/c2b/verification.json`. No se probó Android físico.

## Límites y continuación

Ahora hay15 entradas de medicación IV preparadas por el mismo ejecutor, **no30 tratamientos completos**. La función pura se compara en13 casos, pero únicamente APP/CIRR tienen ejecutor jugable. Las formulaciones especiales y los otros11 casos siguen pendientes.

C2 siguiente: albúmina por peso, infusión de noradrenalina, transfusión y demás formulaciones originales. Antes de migrar albúmina, reproducir la colisión de `Enfermera monitor y albumina 1.5 g/kg` con estudio hepático: el scanner actualmente puede elegir hepatograma; no certificar fármaco por tener alias. Anfotericina explícita mg/kg también requiere resolver la pérdida histórica de /kg, no copiarla.

C3 sigue pendiente de conectar el motor peritoneal extraído con sus efectos inmediatos y reglas posteriores efectivas; no trasladarlo a APP/CIRR. C4 requiere los cierres propios de las tres peritonitis. C5 todavía no habilita multijugador clínico del producto: la CI2/3/4clientes prueba el protocolo real HTTP, no una guardia clínica completa.

## C2.b.1 — Respuesta subjetiva y examen, corrección de integración

La comprobación manual funcional reprodujo una omisión: APP seguía respondiendo7/10 después de4mg reales, pese a analgesia activa=.6193. El resultado fisiológico y el catálogo de C2.b funcionaban, pero `readPatientObservations` aún declaraba que no había ningún analgésico ejecutable.

Ahora entrevista y examen pasan el minuto nativo del **mismo reloj autorizado** a la función pura de observaciones. La reducción usa los4puntos de `ns421 symptoms()` y el redondeo original, ponderados por la analgesia de la función efectiva final de morfina. No copia el alivio indefinido que el antiguo chip activo mantenía tras eliminarse el fármaco. Una orden pendiente no alivia; el dolor observado y referido concuerdan tras administración y reaparece al desaparecer el efecto. CIRR no obtiene analgesia ficticia de un caso sin indicación de dolor en el modelo recuperado.

No se cambia fisiología, administración, autoridad, supervivencia ni XP. Los dos consumidores usan un instante explícito y la observación no avanza tiempo ni crea recibos. Dos pruebas nuevas RED/GREEN reproducen entrevista/examen/eliminación y una nueva administración con nuevo alivio en Solitario y Aprendiz. Validación local:374/374 V5,40/40 core, ambos builds, boundary y diff aprobados; revisión focalizada sin Important/Critical pendientes. El bot de navegador añade un ingreso APP independiente con vía/enfermera/dosis reales y evaluación antes/después/tras eliminación. Las20comparaciones originales de conversación y40de examen sin analgésico siguen iguales a V4. CI de esta corrección debe verificarse en su nuevo SHA; la CI del párrafo anterior identifica únicamente C2.b.
