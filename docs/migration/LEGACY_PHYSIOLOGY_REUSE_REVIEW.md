# ATRIA 5.0 — Validación médica de la fisiología heredada 4.8.7 y decisión de reutilización

**Fecha:** 2026-10-17. Rama única `atria-5.0-core-rebuild-experimental`. Código clínico de revisión `251dfe797d79512adaa158ce161e7d92a4e5e390`. No modificar versión antigua ni duplicar escritores fisiológicos en V5. Solo modelos **educativos y de videojuego**, no predictores clínicos para pacientes reales.

## Decisión

**Sí, reutilizar el sistema heredado, seleccionando sus componentes funcionales y no sus wrappers/experimentaciones.** La lógica más adecuada para la idea de ATRIA es `csPharmResponse487` + `csPharmContext487` (`src/clinical/pharmacology-registry-487.js`) para efectos generales y `csPharmOutcomes487` (`src/clinical/pharmacology-outcomes-487.js`) para progreso clínico dependiente del caso. Ofrecen un comportamiento intencionalmente simple, que utiliza los signos **ACTUALES** (PA/SatO2), rasgos clínicos, exposición confirmada y el tiempo transcurrido.

Pero la **V4 realmente jugable** no tenía un motor único autosuficiente: mezclaba la progresión nativa del caso, una capa farmacológica por catálogo y adaptadores insertados en HTML. Por tanto, NO copiar `src/integration/pharmacology-487.js` ni la secuencia de wrappers de `apply-487.js` a V5. El `src/clinical/physiology-pilot-487.js` (`b1-shadow-1`) es un **motor experimental** que no era el dueño exclusivo de la evolución clínica efectiva; algunas pruebas del Ringer eran QA opt-in y se detectaron dobles escritores en sepsis. No presentarlo como producción certificada.

**Regla de arquitectura:** los contratos heredados puros pueden ser consultados y reusados; los efectos sobre `patient.liveVitals` deben ser aplicados por **un solo dueño**, la política nativa del caso controlada por `createGuardSession`. `createNativeClinicalPort`, enfermería y `room-authority` siguen siendo el único camino de ejecución/recibos. No añadir offsets históricos sobre una fisiología V5 que ya aplica el mismo efecto.

## Pruebas clínicas nuevas (reproducibles)

`src/v5/clinical/legacy-pharmacology-sanity.test.js` prueba directamente **el código fuente real del legado** (no copias de sus fórmulas ni un nuevo motor):
- **Oxígeno:** ante SatO₂ 85%, la respuesta genérica es positiva pero acotada; ante SatO₂ 98% no obtiene saturación gratuita. No modela todos los riesgos de retención de CO₂.
- **Vasopresor:** en shock con vasoplejía, la subida de PAS/PAD es mayor que en un paciente normotenso; este último genera advertencia `pressor-without-shock`. No aumenta SatO₂ arbitrariamente.
- **Cristaloides:** la hemorragia/hipovolemia permite subida de PA y reducción de taquicardia; dosis *confirmadas* altas en cirrosis empeoran gradualmente FR/SatO₂ (V5). Sin rescate hemodinámico positivo artificial en CIRR estable.
- **Morfina:** reduce componente de estrés/dolor y puede producir hipotensión en un paciente ya hipotenso; advertencia específica. Depresión respiratoria existe en el piloto B1 y ficha farmacológica, pero **no está implementada completamente en la ruta nativa V5**.
- **Furosemida:** reduce signos de congestión, pero en hemorragia/shock reduce PA y alerta; aplicación tardía, nunca acción instantánea en el minuto cero.
- **Antibióticos:** en APP, ceftriaxona o metronidazol **solos** no constituyen cobertura suficiente; se necesitan ambos administrados. La respuesta sobre carga infecciosa es tardía y menor si la fuente abdominal sigue sin resolverse. V5 mantiene ausencia de beneficio hemodinámico inmediato inventado.
- **Robustez del catálogo:** 29 reglas × 13 casos × 3 estados hemodinámicos/respiratorios × 3 tiempos = **3.393 ejecuciones** evaluadas; sus offsets deben ser finitos, acotados y con fase 0–1. Esta matriz comprueba sanidad matemática y compatibilidad de datos, **no** la validez terapéutica de cada posible combinación.

CI al publicar prueba: `npm run test:v5` **257/257**, `test:v5-core` **40/40**, `actual-http-multiplayer-browser` verde. La CI integral del commit se debe confirmar por run; no asumir aprobada solo por estos jobs.

## Comparación con referencias médicas externas

El objetivo es **dirección correcta, tiempos razonables y consecuencias visibles**, no reproducir farmacocinética cuantitativa.

| Mecanismo | Referencia clínica general | Dictamen educativo |
|---|---|---|
| Hipotensión séptica → vasopresor | Surviving Sepsis Campaign 2026, objetivo de PAM ~65 y norepinefrina como opción inicial; los líquidos son parte de reanimación, se reevalúa respuesta | Compatible por **signo** de PA, no valida magnitud ni dosis |
| Cristaloides → congestión/edema si se excede capacidad | Merck Manual, edema pulmonar puede relacionarse con sobrecarga IV | Compatible; la condición debe depender de volumen confirmado y susceptibilidad, no solo de una etiqueta diagnóstica |
| Oxígeno → responder a hipoxemia, evitar hiperoxia | BTS, objetivos habituales SatO₂ 94–98% salvo riesgo de hipercapnia | Compatible en casos simples; límites específicos de EPOC/CO₂ pendientes |
| Morfina → analgesia con riesgo hemodinámico y respiratorio | DailyMed morphine sulfate injection, hipotensión y depresión respiratoria | Compatible parcialmente; faltan toxicidad respiratoria y rescate V5 |
| Furosemida IV → inicio en minutos/diuresis, peligro en hipovolemia | DailyMed furosemide injection, inicio diurético dentro de ~5 min, máximo inicial en media hora | Compatible en tendencia y retraso de onset; diuresis/volumen urinario explícitos pendientes |
| Antibióticos y control de foco | Surviving Sepsis Campaign 2026: antibióticos tempranos y control de foco; no curación inmediata de shock por antibióticos | Compatible: cobertura condicional + beneficio indirecto tardío; no usar antibióticos como `+10 PAS` |

Fuentes:
- https://sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026
- https://www.merckmanuals.com/professional/cardiovascular-disorders/heart-failure/pulmonary-edema
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5531304/
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=1f53de80-efc8-4930-b3e3-fba0d026af05
- https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=421aa6d5-623b-4dc2-abd5-bb9e7765bf37

## Debilidades que NO conviene copiar a V5

1. **Sobrerrespuesta al volumen en cirrosis:** en `csPharmResponse487('fluid', CIRR-001)`, el rasgo `congestion` provoca `-3 SatO₂/+3 FR` *aunque el paciente aún no acumule líquidos*. El test deja esto como caracterización para impedir añadirlo encima de `crystalloidOverloadOffsets` de V5. Mantener el criterio de volumen realmente administrado.
2. **Dosis/tiempos aproximados del catálogo:** `csPharmResponse487` usa una única magnitud orientativa multiplicada por fase y en V4 el adaptador multiplicaba por dosis con límites de escalado. Esto basta para mostrar consecuencias generales, pero no es acumulación farmacocinética ni sirve para todas las sobredosis. Mantener marcado como aproximación.
3. **Catálogo ≠ ejecución:** registrar una regla para 29 tratamientos no implica que los 29 estén administrables en V5; por ahora la sesión local completa solo los subconjuntos CIRR/APP. No exponer fármacos desconocidos como administrados automáticamente.
4. **Dobles efectos en V4:** combinación histórica de progresión séptica, rescue y mecanismos opt-in produjo controversias de doble escritura. V5 debe tener único avance fisiológico por paciente.
5. **Infecciones:** `csPharmOutcomes487` entrega índices relativos de infección, dolor, ascitis y riñón, NO valores analíticos ni una evolución mortal completa. Para 24h de guardia, los antibióticos cumplen condición clínica con respuesta tardía condicionada a control de foco y susceptibilidad.
6. **Seguridad:** validaciones de ruta/dosis y confirmación por enfermería son previas a la fisiología; una medicación indicada erróneamente pero técnicamente ejecutable debería producir consecuencias, no bloquearse por ser mala decisión clínica.

## Integración futura mínima, SIN reconstruir fisiología

Cuando C21.d/C22 habiliten motor clínico común multiusuario:
1. Conservar el paciente y el reloj de `createGuardSession` como verdad.
2. Reutilizar **solo los evaluadores puros** del catálogo y resultados V4, con un adaptador de lectura que toma `caseDef`, `liveVitals`, estado clínico/progresión y `administrationLog` confirmada. El output es una **propuesta de efecto**, no una escritura.
3. Para cada mecanismo, asignar exactamente **un escritor**: si APP/CIRR ya modela ese efecto, mantenerlo y no sumar el genérico; para un fármaco nuevo, la política del caso decidirá cómo aplicar el efecto genérico conservando límites plausibles. Un único `advance` temporal.
4. Registrar efecto por `sourceEventId`, paciente y momento, con ejemplos de orientación y efectos contraproducentes. No re-administer por retransmisión.
5. Añadir *solo* pruebas clínicas de signo, tendencia, saturación, tiempo y escenarios de errores relevantes, sin exigir valores clínicos de precisión.
6. Integración a Coop/Competitivo usa el mismo ejecutor: réplicas muestran `liveVitals` y registros, sin correr otra simulación.

**Conclusión:** el legado aporta el modelo adecuado para la experiencia educativa propuesta. NO hay justificación para reconstruir un motor farmacológico de cero; seleccionar la lógica general y corregir únicamente las incompatibilidades demostradas es suficiente.
