# ATRIA 5.0 — C12.b: primera respuesta iatrogénica rápida causal

## Contrato del usuario
- Guardia: **24 minutos reales, equivalentes a 24 h simuladas**.
- Antibióticos y medicamentos prequirúrgicos pueden ser criterios de cumplimiento del caso, **no** deben causar una mejoría hemodinámica inmediata inventada. La evaluación del cierre sigue separada de la fisiología.
- Priorizar efectos reales en horas: hemodinámica por fluidos/vasopresores, respiración por O₂/morfina/sobrecarga, alergias si hay susceptibilidad declarada, riesgos de diuréticos y nefrotóxicos en pacientes vulnerables. Nefrotoxicidad y alergias aún deben caracterizarse/implementarse; no inventar una lesión renal instantánea.
- Libertad terapéutica: **una contraindicación clínica nunca es veto de la interfaz**. Si el medicamento está implementado y la vía/dosis son técnicamente compatibles, se administra y produce consecuencias. Una orden técnicamente no implementada sí se rechaza claramente.

## Estado y pruebas
- Repo `javierdario48-star/ATRIA`; rama exclusiva `atria-5.0-core-rebuild-experimental`.
- C12.a HEAD documental `cca7fc005d58820e9465ba2f155af0814bbc17ed` y CI 3/3 [38984626891](https://github.com/javierdario48-star/ATRIA/actions/runs/38984626891).
- Caracterización V4 real C12.b `1c5e867839a9d4826bd8d462b1e02efa467393e2`; CI limpia.
- Primer código de sobrecarga `303e04976c84c7c3c2adfc7c1db9216a75b4f0c2`, con fallas de tests por 0 negativo y typo del fixture (NO dejar como versión aprobada).
- **Último código funcional:** `52efa366882980705896fa10a489dc5c5d8e1eec`, reparadas las aserciones; [CI 38986259144](https://github.com/javierdario48-star/ATRIA/actions/runs/38986259144). `clean-core-contract` PASA 225/225 V5, 40/40 core, 4/4 adicionales. Navegador y regresión histórica estaban en ejecución al documentar. Verificar antes de declarar 3/3. Preview pública matching y Android físico NO verificados.

## Cambio causal C12.b implementado
1. `qa/v5/characterize-rapid-harm.mjs`: ejecuta el **build real V4**, ocho órdenes separadas de Ringer de 500 ml con sus recibos, compara CIRR/APP con controles sin administrar nada a cada 2,7 s y a los 45,6 s. V4 final: ΔFR +4,279845; ΔSpO₂ −4,319874; Δsistólica +17,599894 (V4 muestra aumento de PA también en CIRR; **no es razonable portarlo automáticamente**). Reproducción en CI. Los primeros cinco bolos no muestran toxicidad respiratoria; aparece al superar aproximadamente 2.800 ml.
2. `src/v5/clinical/crystalloid-overload.js`: **proyector puro**, lee `summarizeIVExposures(p)` que solo cuenta bolos IV con `patientUid`, `sourceEventId`, dosis/unidad válidas y verdaderos recibos. Umbral basal calibrado 2.800 ml (configurable por caso si se valida). Sobre el exceso, Δobjetivo FR = 4,4 rpm/litro; Δobjetivo SpO₂ = −3,6 puntos/litro. No escribe el paciente. No introduce fisiología B1-sombra, reloj, scheduler, ledger paralelo ni efectos hemodinámicos artificiales.
3. `src/v5/clinical/native-app.js` y `native-cirr.js`: integran los dos offsets al **único target fisiológico que ya controla y suaviza signos** (modelo 60 Hz cerrado). APP mantiene respuesta a primera hidratación; CIRR **no recibe una subida falsa de PA por bolo**, pero sí puede desaturar y taquipneizar tras exceso confirmado.
4. `src/v5/clinical/crystalloid-overload.test.js`: inicio neutro 500–2500 ml, umbral, curva 3000/4000 ml, sin efecto de antibioterapia o pedidos pendientes, UID fraudulento y configuración inválida, independencia de resolución temporal y proyección 24 h. `physical-nursing.test.js` realiza ocho viajes/preparaciones físicos genuinos en CIRR, sin efecto antes de administración, evolución respiratoria al acumular bolos y sin duplicados al retransmitir el ID final.

## Limitaciones reconocidas
- El umbral y pendientes reproducen una *calibración de juego del antiguo modelo*, no un umbral médico universal ni una predicción de paciente real. Nuevos casos deben declarar susceptibilidad revisada.
- La mortalidad V5, el daño alérgico, la función renal/aminoglucósidos, los opioides y vasopresores siguen fuera de esta migración. No atribuirles efectos hasta validarlos.
- El modelo actual es una respuesta respiratoria a carga acumulada; **aún no simula aclaramiento, diuresis o eliminación de fluidos** durante 24 h. Priorizar una transición de compartimentos solo cuando exista validación y ownership único; no introducir una segunda estimación de carga como verdad concurrente.
- El criterio de cierre de caso sigue independiente de este nuevo mecanismo; las condiciones de seguridad para alta no equivalen a prohibir decisiones peligrosas.

## Próximos pasos C12.c
- Comprobar [CI 38986259144](https://github.com/javierdario48-star/ATRIA/actions/runs/38986259144) completa. Si hay regresión, corregir y publicar nuevo SHA antes de avanzar.
- Caracterizar alergia confirmada a fármaco del catálogo: `qa/iatrogenic-wrong-treatment-487.mjs`, `src/clinical/general-therapy-487.js`, y vías nativas de anamnesis. **Nunca inferir alergia de frases negativas** como “no conozco alergias”. Solo fixtures y casos con susceptibilidad explícita; no introducir alergias ficticias en APP/CIRR.
- Extender catálogo global por rol: cumplimiento de caso vs mecanismos rápidos, alergia condicional y efectos de órgano dependientes del tiempo. Reutilizar registro/caso único; no segundo drug index.
- Migrar mortalidad y rescate verificando clocks 180–480s y ventana 65s efectiva en V4, sin blindaje permanente y sin penalización arbitraria por mala respuesta.
- No nuevos casos, ni `main`, ni cambios en mapas, sprites, teclado, UI o `vendor/**`.

## Traspaso reproducible
> Repo `javierdario48-star/ATRIA`; rama `atria-5.0-core-rebuild-experimental`; último código C12.b `52efa366882980705896fa10a489dc5c5d8e1eec`; leer `docs/migration/STEP_12B_HANDOFF.md`. Guardias 24 minutos reales=24 h; antibióticos/preoperatorios principalmente criterios de cumplimiento, no hemodinamia inmediata. Motor fisiológico único V5 integra carga acumulada de Ringer con consecuencias respiratorias (umbral y pendientes comprobados contra V4 activo); no copia el beneficio hipotensivo de CIRR. Exposiciones solo de recibos reales; ni órdenes ni mensajes alteran signos. Comprobar CI [38986259144](https://github.com/javierdario48-star/ATRIA/actions/runs/38986259144), luego C12.c alergias por perfil explícito y desarrollo clínico temporal, y rescate/mortalidad en etapas. No segundo B1 ni nuevos casos.
