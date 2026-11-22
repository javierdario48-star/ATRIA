# ATRIA 5.0 — contratos extraíbles y versionados

**Repositorio:** `javierdario48-star/ATRIA` · **rama experimental:** `atria-5.0-core-rebuild-experimental`.

**Continuación actual:** [informe de cierre RESP-01 V2](ATRIA-5-CIERRE-RESP-01-V2-2026-11-21.md), [pendientes con CI real](ATRIA-5-PENDIENTES-VERIFICADOS-2026-11-21.md) y [migración de recompensas preparada para staging](ATRIA-5-REWARD-MIGRATION-STAGING-2026-11-21.md). V2 conserva 40/40 y paridad aprobadas; estado de liberación **NO GO** por puertas pendientes. Los snapshots 1.0.0–1.0.3 permanecen intactos: esta continuación implementa/verifica reglas existentes, no crea una versión clínica nueva.

Las reglas de juego se guardan como **snapshots JSON inmutables**. Para impedir que una mejora elimine una decisión previa, **nunca se modifica un archivo ya publicado**: se crea una versión semántica nueva y se registra el cambio. El código compartido puede cambiar solamente con pruebas y sin usar parches por ID de enfermedad. La V1 activa y producción no se activan con estos snapshots.

| Versión | Contenido | Archivo inmutable |
| --- | --- | --- |
| 1.0.0 | Primer contrato común: cuatro modos, medicina libre, fisiología existente, XP, Vega, 24 min, condiciones de lanzamiento. | `ATRIA-V5-RULES-v1.0.0.json` |
| 1.0.1 | Añade seguridad V2 del cierre parcial en alta/Observación, validación de recibos de ambas reprimendas, separación de XP bruta/deuda; V1 sigue intacta. | `ATRIA-V5-RULES-v1.0.1.json` |
| **1.0.2** | **Reglamento maestro histórico integral**: 4 modos, fisiología, UX, enfermería, V2, 55 casos, persistencia y pruebas; resuelve contradicción de **XP Cooperativo totalmente compartida incluidas pistas**. | `ATRIA-V5-RULES-v1.0.2.json` |
| **1.0.3** | **Errata técnica**: corrige la ruta del ejecutor físico de Enfermería a `src/v5/engine/nurse-dispatcher.js`, comprobada contra el árbol; **no cambia las reglas** de 1.0.2. | `ATRIA-V5-RULES-v1.0.3.json` |

## Extraer una versión

Desde una copia del repositorio:

```bash
node scripts/export-atria-v5-rules.mjs --version 1.0.3 --out ./contratos
```

Genera `contratos/ATRIA-V5-RULES-v1.0.3.json`, un archivo autocontenido. También se pueden abrir o descargar los JSON directamente desde GitHub; cada commit ofrece una copia fijada por SHA. **El contenido exportado es una especificación, no una certificación de que todos los tests aprobaron.**

## Criterios universales para no perder el motor original

El **motor fisiológico nativo ya existe**. Los casos V2 son contenido declarativo: signos iniciales, trayectoria, farmacodinámica, probabilidades, condiciones de complicación y rescate, además de objetivos ocultos. **No se crea un segundo escritor de signos vitales, reloj, enfermería o recompensas.**

El médico decide libremente. Si una formulación es técnicamente administrable pero clínicamente equivocada, la orden no se impide por diagnóstico oculto: se registra la exposición real, sus efectos observables y la deducción en la calidad al cierre. Los errores técnicos de dosis, vía o accesibilidad física sí pueden ser rechazados. Si intenta un alta o Observación **formal** no seguras en V2, recibe Dr. Vega y deuda XP, sin desaparecer el paciente ni sus antecedentes. La observación clínica activa no es cierre.

La nota clínica sale solamente del **evaluador único** de requisitos ocultos del caso; las acciones extra no suman puntos automáticamente. En el modo Competitivo los créditos pertenecen al dueño real de la cama, y otro jugador puede asumirla cuando una decisión insegura libera la asignación. En Cooperativo, la **XP completa es común a todos los médicos activos**, incluidas las pérdidas por pistas de Dr. Vega (última instrucción expresa del creador); **el código existente debe conciliarse con esta regla**. En Competitivo la XP es individual.

## Procedimiento de cambio y recuperación

1. Leer esta carpeta, el contrato JSON de mayor versión y `docs/ATRIA-5-CASE-INTEGRATION-CONTRACT.md`.
2. Identificar el único módulo dueño de la regla. Corregirlo sin introducir excepciones `if(caseId===...)` ni reemplazar física funcional.
3. Añadir pruebas unitarias, recibos reales y bots para los cuatro modos. Confirmar que el cambio no altera V1.
4. Publicar **otra versión JSON** y actualizar este índice. Conservar las versiones anteriores.
5. Registrar el SHA del commit y las URLs de las ejecuciones de GitHub Actions; guardar los artefactos de la ejecución exacta.
6. Solo habilitar Vercel tras CI y pruebas de API, cuentas Supabase, Android y rollback; un deployment antiguo READY no certifica un commit nuevo.

**Puertas todavía abiertas:** integrar el receptor clínico sin acceso a la enfermedad real; validar las sanciones online de Observación y su deuda; aprobar el ciclo V2 en cuatro modos y regresiones transversales; probar Android físico, CPU/memoria y Preview Vercel del mismo SHA.

## Consultar el contrato actual y sus pendientes

- [**Reglamento maestro 1.0.2**](ATRIA-5-REGLAMENTO-MAESTRO-2026-11-21-v1.0.2.md): todas las instrucciones recuperables, organizadas por bloques R0–R10, con precedencia, contradicciones resueltas, reglas de los cuatro modos, medicina, XP, interfaz y arquitectura.
- [**Pendientes auditados**](ATRIA-5-PENDIENTES-VERIFICADOS-2026-11-21.md): estado reproducible P0/P1/P2, ejecuciones CI, fallos, código afectado y prueba necesaria para cerrar cada problema.
- [**JSON recuperable 1.0.3**](ATRIA-V5-RULES-v1.0.3.json): versión autocontenida y rutas técnicas comprobadas; conservar 1.0.0, 1.0.1 y 1.0.2 para comparar decisiones. El reglamento maestro sigue siendo 1.0.2, pues 1.0.3 solo corrigió un puntero técnico.

**Regla de precedencia:** ante una discrepancia entre documentación antigua y contrato 1.0.2, **manda la instrucción expresa posterior del creador**, no la descripción del comportamiento anterior. En especial, **Cooperativo comparte todas las ganancias y pérdidas de XP, incluyendo pistas**; el ledger de actor existente es una brecha **pendiente de corrección**. Un archivo de reglas no representa por sí solo implementación ni CI verde.
