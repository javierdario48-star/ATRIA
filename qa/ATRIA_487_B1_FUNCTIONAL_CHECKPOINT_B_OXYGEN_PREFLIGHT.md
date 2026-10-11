# ATRIA 4.8.7 — Checkpoint B: preflight de oxígeno sin duplicar efectos

**Rama exclusiva:** `atria-4.8.7-grace-nursing-qa`. **Último CI del bot:** [38161397379](https://github.com/javierdario48-star/ATRIA/actions/runs/38161397379) SUCCESS en el SHA `c0994eda298472f2c39eca529fa187907f080252`.

## Prueba ejecutada

El bot añadido `qa/physiology-live/oxygen-preflight-487.mjs`, integrado en `npm test` y en `npm run qa:oxygen-preflight`, reproduce el HTML generado con enfermería real y la evolución clínica nativa en VM Node. Compara PERI-SEC-001 sin oxígeno frente a oxigenoterapia 4 L/min administrada por enfermería. Instala el **observador B1** sin ningún escritor clínico nuevo.

- Mientras hay preparación, no hay recibo de administración ni efecto B1.
- Tras completar la orden, el historial contiene **una administración confirmada** y el observador produce **un recibo de sombra**; flujo B1 4 L/min.
- A 10 s reales, `SpO₂ nativa sin O₂=91.80624520733787` y `con O₂=97.77613004717973`.
- `therapyEffectTotals()` nativo aporta **+6 de SpO₂** para la oxigenoterapia.
- Además, `csCriticalRescuePhysiology487` consume la misma evidencia reciente y **aumenta oxigenación fisiológica**; el bot comprueba el segundo escritor positivo. No se afirma que ambas aportaciones sean literalmente dos aumentos de seis puntos; son **dos rutas distintas**.
- Oxígeno no se presenta como control del foco infeccioso.
- Los otros cinco mecanismos registrados del piloto y Ringer conservan su situación experimental previa. El propietario clínico de O₂ continúa siendo el nativo.

**Conclusión de seguridad:** **todavía no es seguro activar un escritor B1 de oxígeno**. Conviviría con una suma directa de SpO₂ y una modificación fisiológica desde rescate crítico. También faltan contratos de evidencia de *inicio, modificación de flujo y suspensión efectivamente ejecutados* con acceso a historia completa. El objeto B1 tiene acciones `start/setRate/stop`, pero la mera existencia del esquema no demuestra que la enfermería nativa ejecute o registre `stop`. No transformar órdenes pendientes ni marcas de terapia activa en suspensiones confirmadas.

## Próximo cambio mínimo autorizado

1. Trazar y testear la frontera causal **oxigenoterapia→oxigenación→SpO₂** del motor antiguo, `therapyEffectTotals`, `progressionOffsets` y `csCriticalRescuePhysiology487`, conservando la evolución respiratoria por enfermedad. Identificar aportes indirectos, especialmente `ns423` y puente séptico.
2. Separar **evidencia para rescate/gracia/consulta** de **aporte fisiológico terapéutico**, sin eliminar ningún recibo real.
3. Verificar en el ejecutor si cambio de flujo y suspensión son realizables. Si no lo son, diseñar únicamente el mínimo contrato de ejecución real requerido; no inferir un `stop` desde el texto o borrar `monitorTherapies`.
4. Integrar en QA experimental un solo nuevo responsable del efecto de oxígeno por paciente, con un modo sombra como predeterminado; sin doble cálculo de SpO₂ ni oxigenación, y sin migración a mitad de guardia.
5. Probar compatibilidad de owner/hooks con una admisión que pueda recibir Ringer y oxígeno simultáneamente, sin crear otro motor ni registrar el mismo evento dos veces.
6. Exigir pruebas de dosis/flujo insuficiente, respuesta parcial/refractaria, suspensión, desaturación natural, rescate de 65 s y gracia de 180–480 s; rollback antes o después de la atención, nunca mutando un paciente activo.

**No ampliar aún noradrenalina, morfina ni furosemida como escritores reales.** Los mecanismos B1 permanecen definidos y probados en sombra; no hace falta reconstruirlos. Se puede continuar con otro checkpoint independiente una vez esta frontera tenga pruebas verdes.

## Restricciones y límites

No se modificaron fisiología, enfermería, rescate, gracia, XP, cirugía, multijugador, golden master, producción, main, QA original, Supabase ni credenciales en este checkpoint. El CI aprobado valida la ausencia de regresiones del test y build, **no** la seguridad de una transferencia aún no implementada. No hay navegador completo ni Android/iOS físico.

**Regla de eficiencia:** transferir un único mecanismo completo desde el motor antiguo en vez de sumar bonificaciones nuevas, y reutilizar el registro B1 existente. La calidad suficiente es coherencia causal; no se persigue PK de investigación.
