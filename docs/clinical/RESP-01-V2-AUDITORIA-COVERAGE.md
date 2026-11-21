# ATRIA 5.0 — Auditoría de cobertura real de RESP-01 V2

## Adenda de certificación final — bot de observación corregido

**GitHub Actions [44949121720](https://github.com/javierdario48-star/ATRIA/actions/runs/44949121720): SUCCESS**, SHA `8710447553f2f5673834250e6c41621e12d6ff50`. Se completaron los 15 pares de comparación sin errores de la matriz; **8/8 pruebas específicas** de la candidata y de interacción real, y **10/10 regresiones del cierre**. Un perfil adverso con `passed=false` sigue siendo un desenlace negativo documentado, no una prueba clínica aprobada.

La corrección eliminó los **dos intentos prematuros de alta** del bot competente y redujo los comandos de **+6 a +1** frente a V1 en Solitario estable (V1: **22** comandos, V2: **23**). Reevaluaciones: 2 frente a 3. V1 cerró en **12,25 segundos** simulados y V2 en **42 segundos**: el costo residual de **29,75 segundos** se explica por la ventana obligatoria de cinco minutos nativos, **no por CPU ni latencia de red demostradas**. Ambos terminaron en alta con **100 puntos y 133 XP**, sin eventos de alta insegura. El médico lento terminó igual en ambas versiones (138,02 s, 100 puntos). En la complicación rescatada V2 hubo 27 comandos y cierre en Sala a los 150 s; se registró recuperación confirmada y 133 XP.

**Hallazgos vigentes:** siguen sin estar probadas todas las combinaciones del catálogo global, anamnesis libre exhaustiva, todos los medicamentos incorrectos/dosis/contraindicaciones, todas las pistas dentro de un recorrido completo, la historia longitudinal de respuesta al antibiótico ni el HTML/Android físico; no debe confundirse un CI en verde con cobertura del 100 %. La ventana de observación es una decisión de diseño todavía por validar clínicamente: debe existir una alternativa coherente a forzar esperas artificiales cuando la NAC es estable.

---

### Registro histórico: campaña anterior, antes de optimizar el bot

**Fecha de revisión:** 21 de noviembre de 2026. **Objeto:** separar lo ejecutado de lo presumido al comparar V1/V2. Fuente primaria: [GitHub Actions 44934331942](https://github.com/javierdario48-star/ATRIA/actions/runs/44934331942), ZIP de 30 trayectorias nativas y recibos (15 V1 y 15 V2). La ampliación de pruebas de interacción fue certificada con 8/8 y 10/10 el mismo día en la rama experimental. Los recorridos adversos no deben contarse como éxitos de atención aunque el comparador sea verde.

## Resultado de cobertura

- **15 pares / 30 trayectorias:** 15 V2, **9/15 V2** cumplieron todos los criterios del certificador; los otros 6 son trayectorias adversas o incompletas registradas, no aprobaciones clínicas.
- **Personalidades presentes:** calm (2), uncooperative (2), reserved (1), irritable (4), talkative (3), scared (2), anxious (1). Los siete nombres aparecen en las identidades, pero no se inspeccionaron respuestas complejas para las siete personalidades.
- **Estudios completados en la comparación original V2:** {'g_resp01_cxr': 11}. La comparación original solo pidió radiografía; no corroboró por sí misma hemograma, función renal, gasometría ni lactato. Una prueba dirigida posterior sí solicitó y obtuvo los cinco informes específicos de la candidata.
- **Administraciones confirmadas V2 en 15 trayectorias:** {'amoxicillin': 11, 'oxygen': 5, 'furosemide': 13}. En particular, 13 dosis confirmadas de furosemida de 40 mg en el perfil erróneo; son 520 mg registrados y no simples órdenes.
- **Pistas solicitadas en las 15 trayectorias V2:** 0. La prueba dirigida posterior acredita pista del Dr. Vega, 5 % por pista nueva, repetición gratuita y nuevo consejo tras confirmar signos, pero no recorre toda la secuencia de pistas hasta el cierre.
- **Complicación propia:** una única hipótesis clínica programada (`resp01_v2_hypoxemic_setback`), con candidato probabilístico del 20 %; se manifestó como episodio real y, en algunos recorridos, llegó al estado `recovered`. Esa probabilidad es parámetro de juego, no incidencia clínica validada.

## Eficiencia y un error que el comparador original pasó por alto

| Dato observado (Solitario competente) | V1 | V2 original |
| --- | ---: | ---: |
| Tiempo real simulado de guardia | 12.25 s | 43.00 s |
| Comandos únicos del bot | 22 | 28 |
| Reevaluaciones | 2 | 6 |
| Solicitudes de disposición (incluido replay idempotente) | 2 | 4 |
| Intentos prematuros de alta insegura | 0 | 2 |
| Calidad final / XP | 100 / 133 | 100 / 133 |

**Interpretación:** V2 exige `minimumObservationMinutes: 5` en el reloj farmacodinámico; a razón de 0,12 minutos nativos por segundo real, son 41,67 segundos de guardia antes de poder cerrar, frente a 12,25 s de V1. Su retraso de 30,75 s es sobre todo una regla asistencial nueva, no una prueba de sobrecarga de CPU o red. Adicionalmente, el bot solicitaba reevaluación y disposición antes de que venciera el tiempo. Los dos intentos de alta insegura generaron el evento `clinical.unsafe-discharge`, pero una penalización de 0 XP porque el jugador aún no había cobrado experiencia. **Esta es una laguna del test de competencia y potencialmente del criterio de penalización**, no una validación del flujo. Se ha incorporado a la rama experimental una regla del comparador para no reintentar altas incompetentes y para fallar si vuelven a aparecer; exige nueva ejecución de 15 pares antes de dar por resuelto ese punto.

## Medicina errónea, abandono y aleatoriedad observados

- **Furosemida errónea:** 13 administraciones reales de 40 mg, evento adverso registrado como `diuretic-volume-depletion`. Al final de 720 s, TA **91/61 mmHg**, FC 120/min, frente a TA **116/73 mmHg** y FC 106/min en abandono sin esa medicación. El caso no cerró; no se probó un rescate específico del daño diurético ni muerte.
- **Omisión:** en el perfil negligente de V2, la saturación terminó en **87.8 %**, con complicación nativa activa; en abandono sin complicación seleccionada, en **93.8 %**. Son semillas diferentes, por lo que no se debe atribuir toda diferencia al tratamiento.
- **Rescate:** el perfil V2 de complicación completó amoxicilina y oxígeno, con episodio en `recovered` y aceptación de Clínica. Primero se rechazó una consulta por radiografía imprescindible pendiente y luego fue aceptada. La V1 no tenía esa bifurcación.
- **Tratamiento correcto:** se administró amoxicilina; las rutas competentes de cierre finalizaron antes de que se cumpliera el retraso de 30 minutos nativos de su respuesta fisiológica autorada. Una prueba dirigida posterior **sí calculó el efecto diferido desde un recibo de administración real**, pero **no siguió hasta el final una curva vital longitudinal de dos pacientes emparejados tratados vs. no tratados**.
- **Demoras:** existe un médico lento (`slow`) de 138,02 s que cierra con calidad 100 y perfiles negligente/abandono de 720 s sin cierre. No se evaluaron sistemáticamente diferentes ventanas críticas de antibioterapia, rescate o sobredosis.

## Conversación, exploración, estudios, Enfermería y Dr. Vega

- **Paciente:** se obtuvieron respuestas en primera persona para inicio, alergias, antecedentes y apoyo social. Ejemplo: respondió que llevaba tres días con fiebre/tos. `¿medicamentos?` dio `No recuerdo qué medicamentos tomo habitualmente`, mientras la pregunta específica sobre consumo reciente permite obtener el paracetamol documentado. Se necesita calibrar la historia rutinaria del caso y la cobertura de distintas formulaciones.
- **Examen:** en los recorridos competentes se ejecutaron seis maniobras documentadas (general, inspección, auscultación, percusión, palpación y auscultación torácica); se informó crepitación y soplo tubario. La prueba dirigida añadió una auscultación con recibo nativo. No se probaron todas las maniobras globales.
- **Estudios:** 11 radiografías en los 15 recorridos V2 iniciales; cinco informes del caso (Rx, hemograma, renal, gasometría, lactato) comprobados en prueba posterior. Eso NO es verificar todos los exámenes del catálogo global, series repetidas, diferenciales o sobreestudio y penalización por recursos.
- **Enfermería:** en el comparador se comunicaron órdenes naturales como `Enfermera furosemida 40 mg` y se registraron tareas confirmadas. La prueba posterior `Enfermera amoxicilina 1 g oral` confirmó dosis y mensaje del rol de Enfermería. No equivale a probar diálogo libre multivuelta, peticiones ambiguas o conversación del equipo en multijugador remoto.
- **Dr. Vega:** no se pulsó en los 30 recorridos iniciales. La prueba dirigida posterior validó la orden /signos, nueva pista después del recibo, descuento del 5 %, repetición gratuita y 10 % para dos pistas distintas sobre la misma sesión. **No** certifica el árbol completo de pistas por todas las ramas de complicación y destino.

## Aún NO cubierto para aprobar RESP-01 V2

1. Diagnóstico falso plausible comunicado a Clínica u otros servicios sin filtrar la enfermedad oculta; rechazos por contradicción visible, no por ID secreto.
2. Sobreestudios, pruebas innecesarias y alternativas justificadas: costo/XP y no bloqueo por pruebas de calidad opcionales.
3. Historial exhaustivo, negaciones, repreguntas, datos desconocidos y consistencia de las siete personalidades bajo decenas de semillas.
4. Varias dosis incorrectas (sobredosis de amoxicilina, contraindicación, reacción alérgica, fármaco alternativo), rescates causales y ventanas terapéuticas.
5. Observación como **destino formal de cierre**; contraste con Sala y alta, y rechazo de internación injustificada.
6. Pistas desde ingreso hasta cierre de cada desenlace, con reintentos, espera y descuento final auditado en ese mismo caso.
7. Comunicación real de Enfermería y otros servicios en cooperativo remoto, concurrencia de órdenes, Android físico, HTML autónomo V2, red/latencia CPU y Preview Vercel.
8. Comparación de progresión clínica con y sin antibioterapia a los 30–240 minutos nativos, comparando deltas y distintas semillas, no solo la fórmula de objetivos.

**Veredicto:** las evidencias respaldan varios mecanismos auténticos, pero **NO una certificación exhaustiva de todas las acciones ni superioridad de rendimiento general**. Mantener V1 activa y V2 aislada hasta superar esas pruebas.

**Fuentes:** [Batería original de 30 trayectorias](https://github.com/javierdario48-star/ATRIA/actions/runs/44934331942); [pruebas dirigidas ampliadas y bot optimizado](https://github.com/javierdario48-star/ATRIA/actions/runs/44948758989); archivo de resultados `atria-resp01-v2-corregido-evidencia.zip` adjunto a este trabajo.