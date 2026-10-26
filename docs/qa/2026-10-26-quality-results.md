# ATRIA V5: calidad clínica, examen físico y recuperación visual

Revisión del 26 de octubre de 2026 sobre `atria-5.0-core-rebuild-experimental`.
HEAD de partida: `0c5519beecc417e8753c77299ecb959ecde0597b`.

## Resultado comprobado

Los **25 casos tienen recorrido completo por médico experto y competente en
los cuatro modos**, utilizando comandos, estudios, administración y cierre
reales. Se ejecutan **500 recorridos**: 25 casos × 5 perfiles × 4 modos.
No se introducen signos vitales, dosis administradas ni XP desde los bots.

La batería V5 integrada terminó con **2240/2240 pruebas aprobadas**, sin
omisiones. `npm test` histórico también terminó con código de salida 0.
Compilaciones V5 y core aprobadas; el control de arquitectura confirma una
sola autoridad clínica y un solo propietario de RAF, sin temporizadores
nuevos ni ejecutores clínicos dentro de la interfaz.

## Fallas reales corregidas

1. **Paneles de 12 casos que lanzaban una excepción.** La historia y los
   tratamientos reconstruían una definición incompleta del caso y perdían
   sus atributos farmacológicos. `confirmedFluidFeedback` rechazaba esa
   definición al abrir examen, historia, estudios o tratamiento de los casos
   VARIX–ACAL. Ahora la interfaz conserva la definición real y el lector
   reutiliza la normalización farmacológica existente.
2. **Escenario vacío permanente después de una excepción.** El siguiente
   fotograma se solicitaba únicamente al terminar todo el anterior. Una
   excepción después de limpiar el canvas dejaba el hospital vacío mientras
   el DOM seguía visible. El mismo bucle ahora conserva su continuidad y
   registra la etapa que falló; el renderer recupera únicamente su bitmap y
   estado de contexto, sin recrear paciente, guardia, cámara ni órdenes.
3. **Redimensionamientos destructivos.** Un tamaño transitorio 0×0 destruía
   la superficie; incluso reasignar las mismas dimensiones borraba el
   bitmap. Se conserva el último tamaño útil y se evitan asignaciones
   redundantes. Se maneja también pérdida/restauración de Canvas2D.
4. **Examen médico narrado por enfermería.** Cada maniobra y Glasgow generaba
   un eco del médico y una respuesta de enfermería. Los resultados se
   muestran en el panel, conservando sus eventos y registro clínico. Las
   negativas de proximidad/propiedad aparecen como explicación en el panel;
   tampoco se convierten en burbujas del avatar.
5. **Respuesta farmacológica inespecífica.** Algunas terapias reducían todos
   los ejes de deterioro, mejorando presión, respiración u oxigenación sin
   mecanismo adecuado. Los beneficios ahora se limitan al mecanismo y al
   tiempo de una intervención confirmada para ese paciente.
6. **Tacto rectal como estudio de enfermería.** FECAL exige una exploración
   real `Periné → Tacto rectal`. Ya no se ofrece como orden de estudio. El
   hallazgo cambia al reevaluar después de una desimpactación efectuada;
   una orden pendiente no elimina el fecaloma. La evidencia recibe su
   crédito diagnóstico mediante el evaluador original y no deja una falsa
   deuda de estudios en la devolución o en Dr. Vega.
7. **Cierres y ayuda.** Acalasia requiere manometría y endoscopía; los destinos
   ambulatorios de diverticulitis, hepatitis y úlcera requieren seguimiento
   documentado. Se corrigió el reconocimiento de la frase «plan de
   seguimiento y signos de alarma». Reabrir el examen de un caso cerrado
   muestra el registro, sin iniciar una exploración pendiente infinita.

## Tratamientos y estudios

- No se añadieron medicamentos ficticios ni un motor farmacológico nuevo.
- Se corrigió la respuesta de lactulosa: recuperación diferida de orientación,
  en lugar de una mejora artificial de presión/pulso. Shock e hipoxemia
  impiden acreditar esa recuperación.
- Corticoides y tratamiento oral de C. difficile pueden atenuar gradualmente
  fiebre y taquicardia inflamatoria; no reponen volumen ni corrigen por sí
  solos la presión o la saturación.
- Sonda nasogástrica y desimpactación alivian síntomas locales; no sustituyen
  reposición de volumen, cirugía o reperfusión cuando estas corresponden.
- Terlipresina y rehidratación oral conservan respuestas circulatorias
  limitadas. Dar cristaloides a un Crohn/diverticulitis normovolémico no
  concede una bonificación hemodinámica automática.
- La heparina no simula reperfusión mesentérica. El recorrido indicado de
  isquemia mesentérica incluye ahora el antibiótico de amplio espectro que
  ya estaba disponible, además de soporte y derivación.
- Una exposición válida requiere paciente, evento, dosis, vía y momento
  coherentes. Órdenes pendientes, registros futuros o discordantes no
  producen beneficios. Se conserva el propietario único de transfusión,
  soporte IV, daño y evolución.
- No se agregó un estudio nuevo: se integró una maniobra física universal y
  se conservó el identificador histórico del tacto únicamente para
  compatibilidad y orientación, sin ejecutarlo como estudio nuevo.

## Resultado de los cinco perfiles

| Perfil | Recorridos | Resultado observado |
|---|---:|---|
| Experto | 100 | 100 cierres válidos; entrevista de seguridad, monitorización y reevaluación seriada |
| Competente | 100 | 100 cierres válidos con manejo dirigido y reevaluación |
| Principiante | 100 | Atención insuficiente; 0 XP y ningún cierre ficticio |
| Peligroso | 100 | Administraciones reales repetidas de volumen, daño/riesgo respiratorio y 0 XP |
| Lento | 100 | 92 cierres; 8 atenciones demoradas PBE/TER permanecen sin cerrar y sin XP |

Los peligrosos no murieron durante esa observación breve: no se confunde
sobrecarga con muerte instantánea. Las pruebas separadas de exposición grave,
alergia, depresión respiratoria, evolución y muerte sostenida siguen activas.
Los ocho lentos sin cierre tampoco se registran como muertos.

Los 375 recorridos de Aprendiz/Solitario/Cooperativo conservan traza de
comandos, respuestas y reloj. Otros 125 recorren la autoridad competitiva
durable, con desplazamiento real hacia la cama, enfermería física, reinicio
del trabajador, bloqueo de órdenes ajenas y XP exclusivo del dueño. Sus
planteles se distribuyen entre 2, 3 y 4 médicos. Se conservan además las
matrices existentes de Cooperativo y Competitivo con 2/3/4 médicos.

## Los 25 casos

Cada fila tiene cierres de experto y competente en los cuatro modos. El
destino representa continuidad de atención, no una operación ya realizada.

| Caso | Destino del recorrido indicado | Resultado |
|---|---|---|
| CIRR-001 | Sala | 4 modos aprobados |
| APP-001 | Quirófano | 4 modos aprobados |
| CHOLANG-001 | Procedimiento/endoscopía | 4 modos aprobados |
| CHOLE-001 | Quirófano | 4 modos aprobados |
| PANC-001 | UTI | 4 modos aprobados |
| CROHN-001 | Sala | 4 modos aprobados |
| HDA-001 | Procedimiento/endoscopía | 4 modos aprobados |
| COLON-001 | Alta con continuidad diagnóstica | 4 modos aprobados |
| ILEO-001 | Sala | 4 modos aprobados |
| MESI-001 | Quirófano | 4 modos aprobados |
| VARIX-001 | Procedimiento/endoscopía | 4 modos aprobados |
| ENCEF-001 | Sala | 4 modos aprobados |
| UC-AS-001 | Sala | 4 modos aprobados |
| CDI-001 | Sala | 4 modos aprobados |
| DIVERT-001 | Alta con seguimiento | 4 modos aprobados |
| LGIB-001 | Procedimiento/endoscopía | 4 modos aprobados |
| HEPAT-001 | Alta con seguimiento | 4 modos aprobados |
| DIARR-001 | Observación | 4 modos aprobados |
| FECAL-001 | Alta tras exploración y desimpactación | 4 modos aprobados |
| PUD-001 | Alta con seguimiento | 4 modos aprobados |
| CELIAC-001 | Alta con seguimiento | 4 modos aprobados |
| ACAL-001 | Alta con continuidad especializada | 4 modos aprobados |
| PERI-SEC-001 | Quirófano | 4 modos aprobados |
| PERI-PBE-001 | Sala | 4 modos aprobados |
| PERI-TER-001 | UTI | 4 modos aprobados |

## Navegador y reloj

- Chromium 153 real con emulación Pixel 5, orientación vertical y horizontal;
  no se afirma prueba en un teléfono físico.
- 50 guardias y **200 aperturas de paneles**, cubriendo los 25 casos en ambos
  modos locales, sin excepciones. Tacto rectal del fecaloma efectuado en su
  panel mediante navegación real al paciente.
- Examen regional/individual, Glasgow, distancia, reapertura, escritura,
  órdenes de estudio, vía y ceftriaxona: aprobados sin duplicar hallazgos.
- Recuperación gráfica: 12 comprobaciones; espera real de 28 segundos,
  excepción de dibujo, error de actualización de interfaz, rotación, BFCache,
  bitmap descartado y pérdida real de GPU mediante CDP. Se observaron eventos
  **trusted** `contextlost` y `contextrestored`, con recuperación de los 22
  recursos originales. Se conservaron paciente, historia, borrador y
  hemograma pendiente. Los píxeles del escenario volvieron a estar pintados.
- La captura original carece de logs: no se identifica con certeza su primer
  evento en el teléfono. Sí se reprodujo su fallo permanente y se corrigió
  tanto la excepción de los 12 casos como la falta de recuperación.
- La guardia completa conserva 1440 segundos reales/1440 minutos simulados,
  seis admisiones y reloj recuperable. El recorrido determinista de 24 horas
  en autoridad durable pasó en Cooperativo y Competitivo; el navegador pasó
  las pruebas de reloj ante un fotograma largo y escritura.

## Reproducir la verificación

```bash
npm run test:v5
npm test
npm run build:v5
npm run build:v5-core
node scripts/audit-v5-boundary.mjs
node qa/v5/full-guard-24h.mjs
node qa/v5/render-recovery-browser.mjs
node qa/v5/examination-panel-browser.mjs
node qa/v5/all-case-panels-browser.mjs
node qa/v5/clinical-clock-browser.mjs
```

Las pruebas de navegador usan `PLAYWRIGHT_MODULE_PATH` y
`CHROMIUM_EXECUTABLE_PATH` cuando el navegador no está en su ruta estándar.
CI conserva `physician-personas.json`, `competitive-personas.json`, las
comparaciones de tratamientos y la evidencia visual como artefactos.
El estado remoto definitivo corresponde al SHA publicado en GitHub Actions;
una compilación de Vercel por sí sola no acredita esas interacciones.

## Referencias clínicas contrastadas

- [ASCRS: evaluación del estreñimiento, examen rectal e impactación](https://www.ascrsu.com/ascrs/view/ASCRS-Evidence-Based-Guidelines-and-Expert-Consensus/3982011/all/Evaluation_and_Management_of_Chronic_Constipation__2024_).
- [ACG: encefalopatía hepática](https://doi.org/10.14309/ajg.0000000000003899).
- [ACG: colitis ulcerosa](https://gi.org/journals-publications/ebgi/alkazzi_aug2025/).
- [ACG: acalasia](https://gi.org/guideline/diagnosis-and-management-of-achalasia/).
- [IDSA/SHEA: C. difficile](https://www.idsociety.org/practice-guideline/clostridioides-difficile-2021-focused-update/).
- [IDSA: diarrea infecciosa y rehidratación](https://www.idsociety.org/practice-guideline/infectious-diarrhea/).
- [WSES: isquemia mesentérica](https://link.springer.com/article/10.1186/s13017-022-00443-x).

Los tiempos y coeficientes son decisiones de jugabilidad. La aceptación es
coherencia clínica educativa y estabilidad del juego; no precisión
farmacocinética ni curación completa durante una guardia.
