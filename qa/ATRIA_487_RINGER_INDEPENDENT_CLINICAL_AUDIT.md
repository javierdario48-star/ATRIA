# ATRIA 4.8.7 — Auditoría clínica independiente de Ringer experimental

**Fecha:** 2026-10-11. **Alcance:** rama `atria-4.8.7-grace-nursing-qa`; punto de partida `29e816c9e773ada5d481b0c7cdd0418dda700dd4` y CI `38151791016` verde.

**Dictamen:** el flujo enfermería→administración→volumen es operativo en el QA Node VM y conserva las invariantes esenciales; **no está clínicamente listo para activación general**. Se reprodujeron alertas de alto impacto en partición temporal de cristaloides y causalidad de sobrecarga pulmonar. No se modificaron parámetros ni código de fisiología, supervivencia, rescate, enfermería o juego.

## Reproducción independiente

Bot: `qa/physiology-live/ringer-independent-clinical-bot-487.mjs`.

Ejecuta directamente el código clínico y de enfermería del HTML generado a través de `createLiveNativeJourney487` y `enableNativeRinger487`. Son 8 escenarios, con muestras a 1, 10, 30 y 60 segundos reales, siempre sobre `PERI-SEC-001`, en el ingreso experimental local y recién creado. En los escenarios de déficit, el volumen efectivo inicial se fija a **0,45** (índice nativo normalizado, no litros medidos); se comparan 0, 50, 500, 1500, 3000 ml de Ringer. Otros tres escenarios comprueban paciente inicialmente repleto (500/3000 ml) y reserva renal reducida (.2 frente a la normal).

### Pruebas que aprobaron

- Confirmación de un solo bolo y una sola aplicación B1; sin dosis no hay administración fantasma.
- El volumen efectivo y la PAM iniciales mejoran con 500 ml frente a no administrar en el perfil de déficit elegido.
- 3000 ml frente a 500 ml aumentan el índice de sobrecarga y deterioran la SpO₂ cuando el paciente parte de mayor volemia.
- Ringer **no** controla el foco infeccioso; signos observables permanecen finitos.
- El resto del motor sigue siendo el nativo; esto no valida su mortalidad, cirugía gráfica ni precisión médica.

### Datos cuantitativos del bot (PAM mmHg, SpO₂ %)

| Estado y tratamiento | PAM 10 s | SpO₂ 10 s | PAM 30 s | SpO₂ 30 s | Volemia normalizada 60 s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Déficit, sin Ringer | 52,24 | 91,81 | 46,19 | 91,25 | 0,28000 |
| Déficit, Ringer 500 ml | 53,51 | 90,81 | 47,50 | 90,22 | 0,28000 |
| Déficit, Ringer 3000 ml | 59,90 | 85,82 | 54,09 | 85,08 | 0,40239 |
| Inicialmente repleto, Ringer 500 ml | 84,42 | 89,15 | 79,10 | 90,18 | 0,87739 |
| Inicialmente repleto, Ringer 3000 ml | 86,83 | 82,71 | 81,59 | 83,78 | 0,92461 |

Los mililitros son **dosis de ejemplo de simulación**, no recomendaciones de administración. Esta configuración de peritonitis no representa un paciente clínico con datos completos.

## Alertas independientes

### ALTA — Fracción intersticial instantánea fija

El motor registra inmediatamente tras 500 ml **125 ml en circulación / 375 ml en intersticio**. La fracción de 75% se aplica sin modelar explícitamente la duración o velocidad del bolo. La revisión de cinética de fluidos [Hahn 2020, PMID31863457](https://pubmed.ncbi.nlm.nih.gov/31863457/) describe fracción de expansión intravascular dependiente del tiempo de infusión (en los estudios revisados, ~50–60% durante infusión y ~15–20% a 30 minutos de terminar). **No se debe imponer esos porcentajes como constantes clínicas universales**, especialmente en sepsis, pero la partición inmediata 25/75 tampoco puede presentarse como cinética validada.

### ALTA — Penalización pulmonar por volumen atribuido a la dosis aun en hipovolemia

En déficit profundo, a 10 s un bolo de 500 ml produce `SpO₂ 90,81%` frente a `91,81%` sin Ringer y sigue con volemia normalizada 0,4469. Un bolo de 3000 ml produce `85,82%` frente a `91,81%`, con volemia todavía 0,5719. El índice de sobrecarga B1 utiliza volumen intersticial *atribuido a la dosis* y susceptibilidad fija, pero no un estado pulmonar demostrado por intercambio capilar/presión/permeabilidad. Una lesión pulmonar en sepsis es posible; el bot **no** demuestra que esas cifras exactas sean imposibles, pero detecta riesgo de toxicidad pulmonar falsa o desproporcionada.

### ALTA — Sin recambio del intersticio usado para penalización

Los 375 ml de la dosis de 500 ml permanecen como 375 ml a 10 y 60 s; igual ocurre con 1125/2250 ml de bolos más grandes. El índice de sobrecarga sigue recibiendo ese stock parcial aunque el motor nativo disminuya el volumen circulante. Esto es una **contabilidad de dosis parcial**, no una variable de balance neto fisiológico independiente. Debe existir dinámica de distribución, eliminación o recaptación contextual antes de utilizarla para causar desaturación persistente.

### MODERADA — Suelo numérico de shock

Sin bolos y con 500 ml la volemia converge a 0,28 a 60 s. Puede ser shock refractario realista bajo infección no controlada, pero el suelo físico de simulación oculta diferencias de tratamiento. No modificar límites para fabricar supervivencia.

### MODERADA — La reserva renal no cambia todavía el riesgo tras un bolo

El bot compara reserva renal normal y 0,2 con idéntico bolo de 500 ml. El índice de sobrecarga es 0,08571 en ambos. Esto no demuestra por sí solo un fallo agudo: una sola dosis puede distribuirse antes de ser eliminada. Sí confirma que **no se ha demostrado** ajuste temporal de retención/excreción en este escenario; la ficha de Ringer exige cuidado y vigilancia de sobrecarga en disfunción renal.

### CONTEXTO, NO FALLO — PAM no llega a 65 con 500 ml

A 30 s, PAM `47,50` con 500 ml versus `46,19` sin Ringer. Una dosis aislada no tiene obligación de normalizar el shock séptico. Requiere evaluar reanimación escalonada, vasopresores, respuesta dinámica y control de foco; no cambiar coeficientes para alcanzar exactamente 65.

## Fuentes y límites

1. [Surviving Sepsis Campaign 2026, SCCM](https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026): cristaloides balanceados, reevaluación individualizada, medidas dinámicas de respuesta a volumen, objetivo inicial de PAM de 65 mmHg y noradrenalina cuando se necesita. Una recomendación inicial poblacional de 30 ml/kg/3h **no** prescribe un bolo individual ni predice un aumento fijo de PA.
2. [Hahn, Understanding volume kinetics, 2020](https://pubmed.ncbi.nlm.nih.gov/31863457/): el volumen intravascular/intersticial depende del tiempo y de la velocidad de infusión; los datos provienen de poblaciones heterogéneas y no son ecuaciones calibradas para el escenario simulado.
3. [DailyMed, Lactated Ringer's Injection, secciones 5.7 y 8.6](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d3d29c8f-c326-4097-814a-7f4e08c67068): sobrecarga/edema pulmonar, riesgos renales y necesidad de vigilar fluidos/electrolitos/ácido-base; no provee un modelo numérico de SpO₂.

**No existen datos clínicos individualizados** con los que justificar que un paciente específico debe tener PAM 53,51 o saturación 90,81 tras 500 ml. Este bot evalúa plausibilidad causal y coherencia clínica cualitativa, además de invariantes técnicas.

**No se ha probado:** Android/iOS físicos, navegador gráfico, interacción real táctil, mortalidad a partir de parámetros clínicos calibrados, 13 casos completos ni los otros 25 tratamientos.

## Decisión para desarrollo

**No activar Ringer B1 globalmente ni continuar a los otros medicamentos hasta resolver estos puntos.** Mantener `armRinger` apagado por defecto y sin publicación de producción.

Intervención mínima propuesta, evitando arquitectura extra:

1. Conservar un único responsable del bolo, ledger, rescate/gracia/cirugía y motor nativo de enfermedad. No refactorizar este contrato.
2. Reemplazar la contabilidad fija de `interstitialFluidMl` usada como sustituto de edema pulmonar por una variable de carga/neto/distribución dependiente del tiempo y estado, o ajustar la derivación respiratoria para depender de **congestión efectiva**, no exclusivamente de mililitros históricos.
3. Definir y probar explícitamente qué significa “bolus” en la escala temporal del juego: administración inmediata simplificada o infusión durante intervalos. Mantener una representación simplificada si ofrece respuesta coherente, pero no adjudicarle cinética fisiológica verificada.
4. Repetir este mismo bot sin alterar sus oráculos independientes. Exigir que una dosis moderada en hipovolemia no cause por defecto una caída grande de SpO₂ por sobrecarga **sin estado pulmonar que la justifique**; mantener daño por exceso de fluidos en predispuestos. Verificar función renal, pérdida por sepsis y respuesta a norepinefrina nativa, sin “regalar” PA ni supervivencia.
5. Después: probar SHA exacto en navegador QA; solo entonces considerar ampliar a oxígeno/noradrenalina. La clínica debe ser revisada por un profesional antes de la activación general.

### Criterio automatizado

`npm test` incluye el bot independiente y aprueba si las invariantes técnicas/causales duras pasan; además emite alertas explícitas de calibración. `npm run qa:ringer-clinical-gate` tiene un **criterio más estricto** y debe fallar cuando existan alertas de severidad alta. Por diseño no pertenece al CI ordinario mientras el modelo sigue siendo experimental.

Este informe no certifica precisión clínica cuantitativa ni prescribe tratamientos.
