# ATRIA 4.8.7 — Plan de fisiología farmacológica escalable (QA, no producción)

## Alcance real y línea base

- Rama de laboratorio: `atria-4.8.7-pharm-shadow-qa`, derivada exactamente de `648ab59ea170b69d9e4308976535cc5b42fc682c`, el commit transaccional de arranque preparado por Work y aprobado por GitHub CI. La rama `atria-4.8.7-grace-nursing-qa` NO se toca durante estas pruebas; tampoco `main`, `atria-4.8.7-qa`, producción, Supabase, ni `vendor/atria-4.8.6`.
- El catálogo literal tiene 29 entradas; el inicializador clínico añade `anticoagulation` (heparina IV) durante arranque. El catálogo ejecutable posee **30 entradas**; heparina carece aún de una regla farmacológica completa. La instalación transaccional de Work la rechaza y conserva el tratamiento nativo: **no declarar el motor global como instalado/compatible**.
- La primera tarea no es validar clínicamente 390 combinaciones. Es distinguir automáticamente qué está disponible, qué tiene contrato, qué está modelado y qué tiene prueba fisiológica y respaldo médico. Con 13 casos y 30 entradas son **390 pares estructurales**, NO 390 trayectorias clínicas validadas.
- Instrumentación de laboratorio: `src/clinical/pharmacology-shadow-487.js` modela solo cinco mecanismos (oxígeno, cristaloides, noradrenalina, morfina, furosemida) mediante estado dinámico, exposición transitoria e iteraciones fijas de un minuto virtual, **sin enchufarse al juego**. `src/clinical/pharmacology-coverage-487.js` declara los estados de cada par. Los coeficientes actuales son propuestas de simulación, no magnitudes médicas certificadas.

## Principios informáticos

**Separación de responsabilidades**
1. **Fármaco**: identidad, mecanismo, vía, reglas de exposición/vida media, contraindicaciones y toxicidad. Nunca escribirá directamente la presión arterial de un paciente.
2. **Caso**: fenotipo dinámico inicial, causa y evolución no tratada, parámetros individuales, objetivos clínicos, estudios, fuente infecciosa/hemorrágica, criterios de resolución. No duplica reglas de medicamentos.
3. **Fisiología**: integra volemia, tono vascular, gasto cardíaco, intercambio gaseoso, perfusión renal, coagulación/infección y síntomas; calcula signos desde el estado. La perfusión renal actualiza aclaramiento y exposición cuando exista PK/PD para ese fármaco.
4. **Enfermería**: únicamente órdenes, permisos, vías y confirmación de administración nativa; jamás modifica variables fisiológicas sin evento de administración.
5. **Proyección**: monitor, resultados de laboratorio y síntomas son observables derivados; no fuente autoritativa para curar causas.
6. **Pruebas**: oráculo clínico externo versionado, distintos de los coeficientes de implementación; expectativas por dirección, escala temporal, umbral y límites.

**Coste computacional**: iterar sobre pacientes activos, mecanismos habilitados y exposiciones activas, evitando el producto total de casos por catálogo en cada tick. Indexación por ID, dependencias explícitas, estado por paciente y paso fijo independiente de FPS. Para multijugador, evolucionar estado únicamente en la autoridad designada y distribuir snapshots/versiones, nunca aplicar el mismo tratamiento en varios clientes. Sin red ni IA pagada para calcular fisiología.

## Secuencia de implementación y pruebas (fases separadas)

### A. Inventario verificable y arranque protegido

- La corrección transaccional de Work se considera base. La auditoría de 13 casos x catálogo real detecta heparina `anticoagulation` como incompleta y bloquea promoción de compatibilidad. Un CI verde del fallback NO equivale a compatibilidad del catálogo.
- Clasificar cada par como `pilot-tested`, `pilot-only`, `contract-only` o `missing-rules`. No degradar esta distinción para conseguir CI verde.
- Criterio de salida: función nativa idéntica tras rechazo de catálogo; ninguna dosis fantasma ni instalación parcial; el nuevo informe siempre menciona heparina.

### B. Validación fisiológica independiente de tres pilotos

- Casos: `PERI-SEC-001`, `HDA-001`, `CIRR-001`. Intervenciones: oxígeno, Ringer, noradrenalina, morfina, furosemida.
- Ejecutar pares en 13 casos para detectar valores no finitos, pero comparar cuantitativamente el comportamiento solo en los tres pilotos. Escenarios: sin tratar, terapia indicada, terapia perjudicial, dosis menores/mayores, suspensión, dosis acumuladas, empeoramiento renal y combinación.
- Oráculo independiente obligatorio: referencias clínicas y juicio experto para magnitudes, intervalos, efectos adversos y umbrales; no asumir que un resultado que cumple pruebas de software es médicamente verdadero.
- Comprobar reproducibilidad exacta entre secuencias equivalentes de ticks, no dependencia del renderizado. Desactivar la bandera experimental significa que el juego original se comporta exactamente como antes.
- Criterio de salida: comparación documentada `motor actual ↔ shadow`, presupuestos de cómputo medidos y ninguna regresión en enfermería, muerte/tiempo, Cirugía, XP, voz y multijugador.

### C. Completar reglas de los tratamientos existentes por mecanismos

- Por orden de prioridad clínica y riesgo, no por longitud del catálogo: hemodinamia y perfusión; oxigenación y analgesia; antibacterianos con resistencia y control del foco; función renal/diuréticos; hemorragia/transfusión/coagulación; inmunomodulación, ascitis y fármacos digestivos.
- Heparina requiere **mecanismo de anticoagulación/coagulación y evaluación de trombosis y hemorragia**; no añadir `effects:{}` ni un coeficiente hipotensor para simularla. Usar fuentes y validación clínica antes de desbloquear el catálogo.
- Agrupar agentes diferenciados actualmente bajo alias genéricos (`analgesia`, `antiemetic`, `steroid`, `beta_blocker`) cuando el mecanismo, tiempo y toxicidad dependen del principio activo.
- No migrar más de un mecanismo clínico por checkpoint. Mantener el motor activo intacto hasta pasar oráculo de casos piloto y tests integrados.

### D. Alta declarativa de enfermedades y fármacos

- **Nuevo caso**: esquema versionado con `id`, `traits` iniciales, parámetros fisiológicos cuantitativos, causa/evolución, laboratorios, diagnóstico/destino y estudios, más variables especiales. Rechazar caso que necesita un eje fisiológico inexistente; no fabricar respuesta.
- **Nuevo fármaco**: nombre, IDs/aliases, vía, unidad/dosis simulada, mecanismo ya existente o plugin nuevo, absorción/entrada, aclaramiento, inicio/duración, efectos/toxicidad/contraindicaciones, requisitos de monitorización y pruebas. Debe integrarse globalmente en **todas** las rutas: catálogo, voz, enfermería, monitor, historia, PK/PD y pruebas.
- Regla global del fármaco + estado del paciente → respuesta contextual, no una tabla individual `medicación × enfermedad` salvo excepciones explícitas con evidencia, alcance y test.
- Schema con integridad referencial estricta. La incorporación de heparina mostró por qué validar únicamente el catálogo literal es insuficiente: toda prueba de compatibilidad debe usar el catálogo real **tras bootstrap**.

### E. Validación escalable y gradual

- **CI rápido**: tipos/contratos, determinismo, ausencia de `NaN`, límites, errores, requisitos IV, no administración fantasma; test dirigido a ejes afectados por cada medicamento nuevo, más regresiones clínicas críticas.
- **CI ampliado programado**: todos los medicamentos contra todos los perfiles con estados renal/hemodinámico extremos; pares e interacciones relevantes seleccionadas por dependencias, no combinaciones exponenciales innecesarias.
- **QA manual**: exactamente el SHA de preview READY en Android/iPhone real, además de partida cooperativa/competitiva con dos clientes; Node VM verde no reemplaza esa aceptación.
- Mantener una calificación separada `software_pass` / `clinical_reviewed` / `device_accepted`. No promover producción sin cumplir puertas definidas.

## Rendimiento y criterios de rollback

- Perfil de CPU/memoria: medir p50/p95/p99 por paso virtual con 1, 5, 20 pacientes y 1, 5, 15 exposiciones por paciente. Los presupuestos iniciales (<1 ms p95 por actualización de 20 pacientes en teléfono medio como **objetivo tentativo, no resultado observado**) se deben revisar tras medición real.
- No acoplar tiempo de tratamiento a frames. Paso fijo virtual con acumulador; limitar catch-up y distinguir pausa/no visibilidad. Evitar loops `for(case) for(drug)` en cada frame.
- Cada migración mantiene su propio feature flag, benchmark, diffs de trayectorias y checkpoint. Ante divergencias clínicas no explicadas, volver al motor previo sin alterar registros ni progreso.

## Siguiente aprobación

**Aún NO publicar ni activar el shadow en la guardia.** Primero ejecutar sus regresiones y el catálogo real con heparina. Luego crear oráculos clínicos independientes y medir la concordancia del piloto. Solo después evaluar si conviene incorporar un mecanismo al runtime con bandera reversible. Nunca prometer una fisiología clínicamente validada a partir de este prototipo numérico.

## Checkpoint 2026-10-10 — Primer prototipo verificado

- Base aislada: `648ab59ea170b69d9e4308976535cc5b42fc682c` (commit publicado por Work, seguro ante instalación parcial). Prototipo en rama `atria-4.8.7-pharm-shadow-qa`. No integra el runtime de guardia ni modifica casos/fármacos del juego activo.
- Código puro `pharmacology-shadow-487.js`: inicio con rasgos de los 13 casos, estado fisiológico dinámico independiente de signos, dosis virtuales limitadas, fluidos como volumen, oxígeno y noradrenalina como soporte suspendible, morfina y furosemida con eliminación exponencial, deriva hemodinámica y renal; simulación reproducible con paso fijo. Los coeficientes son solo candidatos de calibración.
- `csShadowRegisterDrug487`: un agente nuevo con mecanismo existente puede incorporarse al catálogo **experimental** y producir efecto a través de ese mecanismo en cualquier caso sin alterar reglas por diagnóstico. Un caso sintético nuevo hereda sin modificaciones los mecanismos originales de oxígeno y fluidos. Los mecanismos nuevos desconocidos deben rechazarse hasta desarrollarse y aprobarse por separado.
- Escenarios comprobados: 13 casos × 5 mecanismos = **65 evaluaciones base** de valores finitos; pruebas causales enfocadas en peritonitis secundaria, hemorragia digestiva y cirrosis; oxígeno en hipoxemia frente a 99% normal, deterioro hemodinámico y renal con diuréticos en hemorragia, reanimación, noradrenalina tras suspensión, toxicidad respiratoria por exposición opioide elevada, ascitis, dosificación y evolución determinista. **Estas pruebas NO constituyen validación clínica de magnitudes**.
- Auditoría de catálogo tras inicializador: 13 casos × 30 entradas = **390 pares estructurales**. Estado en primera ejecución verde: `pilot-tested=15`, `pilot-only=50`, `contract-only=312`, `missing-rules=13` (exclusivamente heparina `anticoagulation`). La instalación compatible debe permanecer BLOQUEADA hasta modelar anticoagulación clínicamente.
- Test de escalado: **125 definiciones** (5 base y 120 agentes QA inactivos), mismo resultado clínico con o sin esos 120 inactivos. Medición única en Node.js CI, para 240 minutos virtuales con 3 exposiciones activas por paciente: 1 paciente 1.25 ms, 5 pacientes 5.62 ms, 20 pacientes 8.25 ms. Estos números no son p95 ni representan rendimiento Android o iOS.
- CI completo **SUCCESS** en `cd12de83e7a4318a662019c86a5acbe3e3135603`, GitHub Actions `38095300239`: fuente, pruebas históricas, motor shadow, nueva enfermedad/medicamento, cobertura, build y sintaxis de 70 scripts inline. No hay verificación clínica independiente, Android físico ni preview de SHA exacto. Ninguna publicación a producción.
- Próxima puerta: obtener para cada uno de los cinco mecanismos un oráculo clínico independiente documentado, medir dinámica de 3 pilotos y corregir discrepancias en shadow. Después introducir, uno por uno, los mecanismos de las restantes 24 entradas contract-only; heparina exige mecanismo de coagulación. Mantener el estado de protección de la rama original.
