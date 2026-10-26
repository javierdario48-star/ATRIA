# ATRIA 5.0 — Auditoría docente y farmacológica de 25 casos

Fecha de revisión: 26 de octubre de 2026. Versión experimental. **No constituye una validación científica de un modelo fisiológico ni una guía de prescripción para pacientes reales.**

## Qué se verificó realmente

1. Se añadieron 375 recorridos clínicos (25 enfermedades × Aprendiz, Solitario y Cooperativo × cinco perfiles: desinformado, principiante, inteligente, lento e imprudente). Todos utilizan el ejecutor real de guardia y nunca introducen XP o tratamientos fuera de la autoridad clínica.
2. Los médicos inteligentes realizan anamnesis, exploración, pruebas, intervenciones, reevaluación y decisión de destino; se exige cierre clínico y XP único.
3. Los principiantes no pueden completar una atención con evidencia insuficiente. Los desinformados reciben rechazos ante dosis no validadas; no ganan XP ni provocan cambios por órdenes rechazadas.
4. Los lentos permiten la evolución natural y vuelven a intentar la conducta; deterioro o muerte deben impedir cierres falsos.
5. Los imprudentes provocan exposiciones reales repetidas de cristaloides y se vigilan sobrecarga respiratoria, saturación, frecuencia respiratoria y rechazo de dosis desproporcionadas.
6. Para las enfermedades que usan el ejecutor gastrointestinal adicional se compara un mismo paciente a un mismo instante: sin terapia, orden pendiente y administración confirmada. La evolución SOLO puede atribuirse a una dosis registrada para el paciente y con vía válida.
7. Los bots de Competitivo (2–4 médicos) y Cooperativo persistente (2–4) y los controles de guardia de 24 minutos/24 horas siguen en su batería original. Los 375 perfiles NO sustituyen los controles multijugador.

## Revisión académica por diagnóstico

| Código | Lo que debe enseñarse / terapia principal | Limitación pendiente de profundidad fisiológica |
|---|---|---|
| CIRR-001 | Ascitis, función renal, paracentesis y diuréticos | La recuperación de cirrosis y su función hepática no se modelan |
| APP-001 | Apendicitis: clínica, estudios, antibióticos y traslado quirúrgico | Trasladar no significa apendicectomía efectuada |
| PERI-PBE-001 | Líquido ascítico, antibiótico y albúmina, riesgo renal | No se representa biomarcadores renales completos en serie |
| PERI-SEC-001 | Sepsis abdominal, antibiótico y control quirúrgico del foco | Ninguna antibioticoterapia equivale al control del foco |
| PERI-TER-001 | Peritonitis persistente, cultivos, antibiótico y UTI | La respuesta microbiológica es simplificada |
| CHOLANG-001 | Colangitis con shock: reanimación, antibiótico y drenaje biliar | La CPRE es una derivación, no un procedimiento simulado |
| CHOLE-001 | Colecistitis: dolor HCD, ecografía, soporte y cirugía | Se registra transferencia y no colecistectomía realizada |
| PANC-001 | Pancreatitis grave con hipoperfusión: cristaloides reevaluados y analgesia | No imponer ayuno indefinido ni antibióticos profilácticos; sin cinética real de BUN |
| CROHN-001 | Diarrea crónica, anemia y actividad inflamatoria; tratamiento de EII | Corticoides no representan curación o exclusión de infección |
| HDA-001 | Hematemesis/melena, volemia, PPI y hemostasia endoscópica | **Corregido: pantoprazol no detiene hemorragia activa en el motor** |
| COLON-001 | Anemia ferropénica, colonoscopía y estadificación oncológica | No curar neoplasia durante 24 horas de guardia |
| ILEO-001 | Vómitos, íleo, reposición y posible sonda nasogástrica | Sonda no cura estrangulación intestinal |
| MESI-001 | Dolor desproporcionado, fibrilación auricular, angio-TC y cirugía | Heparina no reemplaza reperfusión ni revierte necrosis |
| VARIX-001 | Sangrado variceal: terlipresina, ceftriaxona preventiva y endoscopía | No simular ligadura endoscópica; falta toxicidad hemodinámica de terlipresina plenamente individualizada |
| ENCEF-001 | Encefalopatía: lactulosa, evaluar precipitantes y protección respiratoria | **No hay escala neurológica dinámica validada**; cambio de frecuencia cardíaca no equivale a normalizar conciencia |
| UC-AS-001 | Colitis ulcerosa grave: estudios, C. difficile, corticoides IV y vigilancia | Evaluación de respuesta a 72 horas excede una guardia; no usar respuesta precoz para decir curación |
| CDI-001 | Infección C. difficile: fidaxomicina o vancomicina **por boca** | El comportamiento de colitis fulminante/dosis especiales no está plenamente modelado |
| DIVERT-001 | Diverticulitis no complicada: seguimiento y criterios de internación | No exige antibiótico universal |
| LGIB-001 | Hemorragia digestiva baja: estabilidad, estudios y derivación | No confundir recepción endoscópica con hemostasia |
| HEPAT-001 | Hepatitis, INR y alarma por falla sintética | No calcula insuficiencia hepática con todos los parámetros dinámicos |
| DIARR-001 | Diarrea acuosa: hidratación y vigilancia, no antibiótico indiscriminado | No existe un balance hídrico intestinal completo |
| FECAL-001 | Fecaloma: tacto, desimpactación y prevención | No simula lesión de mucosa o perforación rectal con probabilidad validada |
| PUD-001 | Enfermedad ulcerosa: PPI y H. pylori | Un PPI no es erradicación de H. pylori |
| CELIAC-001 | Serología y biopsia duodenal, educación y seguimiento | No hay recuperación histológica instantánea |
| ACAL-001 | Disfagia, descartar pseudoacalasia por endoscopía y manometría | Derivar no simula dilatación ni miotomía |

## Casos que requieren prudencia especial en la revisión manual

- **Hemorragias HDA-001 y VARIX-001**: cambio de PA/FC con transfusión o fluidos no indica hemostasia definitiva; confirmar que la enfermera no acredite la transfusión sin vía, dosis y recepción.
- **ENCEF-001**: lactulosa puede influir en la trayectoria simplificada, pero aún falta un grado de encefalopatía evolutivo, aspiración y deposiciones; no declararlo fisiológicamente completo.
- **UC-AS-001**: requerir evaluación de C. difficile y evitar valorar respuesta total al corticoide antes de las 72 horas.
- **CDI-001**: vancomicina intravenosa no sustituye la vancomicina oral intestinal; la presentación fulminante necesita reglas distintas.
- **CIRR-001, PBE y PANCREATITIS**: la sobrecarga de líquidos y medicamentos nefrotóxicos pueden hacer daño; vigilar saturación, FR y creatinina cuando se integre función renal longitudinal.
- **MESI-001**: un paciente inestable puede requerir interconsulta urgente antes de confirmar todos los estudios; el destino final requiere evidencia y aceptación.

## Límites del motor que la CI no debe ocultar

Los registros de administración y los signos vitales son simulaciones educativas discretas, no farmacocinética real. El modelo no dispone de concentración plasmática de cada fármaco, gasto urinario, pérdidas gastrointestinales, hemoglobina en serie, amonio o Glasgow longitudinal en todos los casos. Varias terapias nuevas disponen de formulación, vía y reglas de cierre, pero **no de todas sus contraindicaciones y toxicidades cuantitativas**. Un mismo cambio de presión arterial no puede demostrar que todos los mecanismos farmacológicos sean correctos.

Los resultados de 375 recorridos deben acompañarse de validación humana de cada caso con dos dispositivos y comprobación visual del chat, enfoque de paciente, tiempo de estudios y detalles de enfermería. Hasta entonces la calificación válida es **apto para revisión manual después de CI**, no científicamente validado.

## Guías utilizadas

- ACG, pancreatitis aguda 2024: https://pubmed.ncbi.nlm.nih.gov/38857482/
- ACG, sangrado digestivo alto ulceroso 2021: https://pubmed.ncbi.nlm.nih.gov/33929377/
- AASLD, hipertensión portal/hemorragia variceal 2024: https://doi.org/10.1097/hep.0000000000000647
- ACG, encefalopatía hepática 2026: https://doi.org/10.14309/ajg.0000000000003899
- ACG, colitis ulcerosa 2025: https://gi.org/journals-publications/ebgi/alkazzi_aug2025/
- IDSA/SHEA, infección C. difficile 2021: https://www.idsociety.org/practice-guideline/clostridioides-difficile-2021-focused-update/
- ACG, acalasia 2020: https://gi.org/guideline/diagnosis-and-management-of-achalasia/
