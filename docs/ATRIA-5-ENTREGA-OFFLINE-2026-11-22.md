# ATRIA 5 · Entrega offline y certificación clínica · 22/11/2026

**HTML jugable entregado y probado.** [Descargar RESP-01 V2 experimental](https://chatgpt.com/library?file_id=libfile_265e4f76fbf48191adb047365dba2bc4&account_id=personal). [Instrucciones de uso](ATRIA-5-OFFLINE-USO.md). Código de la entrega: `906e50e34fe815a616fb12daa74e3e3a167024b6`, únicamente en `atria-5.0-core-rebuild-experimental`.

| Decisión | Resultado y alcance |
|---|---|
| GO OFFLINE | Sí: pruebas personales en escritorio por apertura directa, sin servidor. Partida real y recuperación aprobadas. |
| GO V2 EXPERIMENTAL local | Sí: flujo nativo validado con bots y jugable en HTML; V1 protegido en su copia separada. |
| GO ONLINE | No: falta staging alojado, Preview exacto, aceptación externa multicuenta/Android y cierre de CI general. |
| GO PRODUCTION | No: no se solicitó ni realizó activación; requiere autorización y aceptación final. |

## Qué se corrigió realmente

- **Recepción multijugador:** se comparaba HTML del DOM serializado con HTML escrito, por ejemplo `disabled=""` frente a `disabled`. Esto desprendía botones repetidamente. Se conserva el mismo subárbol entre snapshots equivalentes y se actualiza solo el reloj.
- **CIRR y XP:** dos aserciones residuales confundían133 XP brutos con118 netos después de la sanción de15. Se comprueba el desglose y su persistencia; no se eliminó ni devolvió la sanción.
- **Receptor ciego:** un expediente de campos explícitos sustituye el acceso al caso verdadero y su readiness oculta. Los protocolos son conocimiento público. La fisiología, la estabilización, el tratamiento, Enfermería y el cierre conservan sus ejecutores originales. Evaluación/XP sí contrastan posteriormente con la verdad clínica.
- **Recepción especializada:** se corrigió la regresión CARD-02 detectada por CI: Cardiología conserva su protocolo de recepción crítica; no se le aplica el filtro del receptor genérico UTI. Ningún archivo V1 se alteró.
- **Recuperación local:** se guardan mundo/Enfermería, sesiones, reloj, ingresos, pistas, sanciones y progresión compartida. Tras recargar, todos los mensajes incluyen el UUID del documento: no reutilizan IDs antiguos ni se pierden órdenes nuevas por conflictos de idempotencia.

Se reutilizó XP cooperativa ya publicada, incluidas pistas/débitos de la cohorte activa; no se reimplementó. La aceptación de esa política en backend alojado sigue abierta.

## Pruebas y evidencia

| Ámbito | Resultado | SHA / evidencia |
|---|---|---|
| Suite integrada local | 3224/3224, sin fallos ni cancelaciones | Base clínicaef4b06f; corrección posterior de IDs de interfaz:45/45 del área aplicación y navegador siguiente. No son3269 pruebas únicas. |
| Receptor / urgencias / continuidad | 139/139 dirigidas;7/7 frontera ciega y recepción especializada | No se suman al total como pruebas únicas. |
| Casos V1 / traslados | 550/550:55 casos× 10 perfiles;11/11 trabajos | [45019485594](https://github.com/javierdario48-star/ATRIA/actions/runs/45019485594), ef4b06f; [resúmenes por perfil](evidence/resp01-v2-graph-2026-11-22/ci-transfers.json). |
| RESP-01 V2 | 40/40;15 pares V1/V2 sin errores;8/8 recorridos extra;5/5 trabajos | [45019485610](https://github.com/javierdario48-star/ATRIA/actions/runs/45019485610), ef4b06f. |
| Grafo declarativo | 27/27 aristas declaradas observadas en la unión; los40solos dejaban6sin cubrir | [Matriz de aristas](ATRIA-5-RESP01-V2-GRAPH-COVERAGE-2026-11-22.md). No equivale a todas las combinaciones clínicas. |
| Dr. Vega | Recorridos55/55 y menú real aprobados | [45019485602](https://github.com/javierdario48-star/ATRIA/actions/runs/45019485602), ef4b06f; [45020275902](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275902),906e50e. |
| HTML exacto entregado | Arranque2/2; plataforma53/53; partidaV2 completa2/2, sin acelerar reloj clínico | [45020275964](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275964),906e50e. Escritorio y Pixel5emulado, **Android físico no validado**. |
| Persistencia SQL | 9/9 PostgreSQL local | [45019485559](https://github.com/javierdario48-star/ATRIA/actions/runs/45019485559),ef4b06f. No es Supabase alojado. |
| CIRR navegador y Competitivo4 | Aprobados después de la corrección | Jobs137190947199 y137190947322 en [45016869358](https://github.com/javierdario48-star/ATRIA/actions/runs/45016869358),a1b291d. El run general falló en otro escenario y no se declara verde global. |
| Build y arquitectura | Build modular/core aprobados;201módulos de producción, un RAF y sin nuevo temporizador/motor | `scripts/audit-v5-boundary.mjs`; Vercel build preflight también aprobó en CI V2. |

El núcleo clínico y el contenido son **idénticos por Git tree SHA** entre ef4b06f y906e50e: clínico `5a9b3193f5de76bd39a74d1312ee30a4f8ce1fdf`, contenido `5658afc021322623c6d7e4303414c1feb58b63c2`. La entrega906e50e tiene su propia aceptación de interfaz/recuperación. Esta equivalencia se informa explícitamente; no se afirma que todas las campañas corrieran en todos los commits.

Los40 escenarios mantienen atención competente/lenta, complicación-rescate, medicación equivocada, anamnesis alérgica omitida, inexperiencia, negligencia, omisión de estudios, abandono y diagnóstico falso en los cuatro modos. Los8adicionales prueban decisiones inseguras, sanción/replay, orden pendiente, dosis cero, dosis excesiva realmente administrada, alergia preexistente, adrenalina/oxígeno, Vega, recuperación y observación legal. La muerte clínica legítima conserva su desenlace sin convertirlo automáticamente en error de software.

## Partida offline y archivo entregado

La prueba completó recepción y movimiento, anamnesis, examen, estudio y resultado, impresión diagnóstica, Enfermería, pista de Vega, guardado pendiente, recarga, misma identidad, órdenes nuevas, reevaluación, cierre y continuidad de XP. Resultado en ambos dispositivos:133 XP brutos,126 tras pista,−15por alta insegura,**111 XP netos**, una sola dosis de amoxicilina y un solo cierre. Audio/controles/rotaciones se comprobaron en la auditoría de plataforma; el volumen percibido en teléfono sigue pendiente.

[Paquete CI V1/V2](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275964/artifacts/14753636884). El HTML entregado es exactamente el extraído de ese artefacto, no un rebuild local distinto. SHA256 V2: `13aeff54ff16593a5e52fca044151d8f1db1db7ff868844d48fabe512a6c90da`. [Manifiesto](evidence/resp01-v2-graph-2026-11-22/offline-manifest.json) y [recorridos del navegador](evidence/resp01-v2-graph-2026-11-22/offline-browser-report.json).

## Los 88 IDs: qué queda abierto

El [inventario maestro](ATRIA-5-REMAINING-TASKS.md) conserva los 88 IDs y es la única fuente mutable de su estado. Se revisaron sus archivos y pruebas identificados, se añadieron evidencias por ficha y se conservaron sus condiciones originales. No se hizo otra reconstrucción de conversaciones inaccesibles.

| Estado de requisitos completos | Cantidad |
|---|---:|
| Completado y verificado en su ámbito indicado | 10 |
| Implementado, pendiente de aceptación | 52 |
| Parcialmente implementado | 16 |
| Implementado con defectos | 1 |
| No implementado | 3 |
| No verificable | 4 |
| Reemplazado | 2 |
| Total | 88 |

**No están cerrados los 88.** Hay76 IDs vigentes sin cierre completo y2reemplazados. Muchos incluyen aceptación física o funcionalidades de alcance mayor que un defecto reproducido. Por ejemplo, SOCIAL-01/chat privado, WORLD-03/mapa modular y PERF-01/perfilado completo no se convierten en errores clínicos ni en requisitos nuevos de RESP-01V2. Persisten condiciones de familiares, tutor completo, voz, progresión y contenido cuyo detalle está en sus fichas. No se inventan umbrales, textos originales1–60 ni fuentes del libro no recuperadas.

## Bloqueos concretos y siguiente trabajo

1. **QA-01 / REC-01 online:** el run45016869358 falló en `guard-recovery-browser.mjs` al esperar el commit de leave tras cancelar acciones previas. La CI general906e50e [45020275953](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275953) sigue en cola/en ejecución al corte. Obtener el resultado de ese job y reproducir con estado de participación, request/receipt y statusHTTP antes de corregir. No se confundirá ese fallo pendiente con la recuperación offline ya aceptada. No borrar la prueba ni subir su timeout para conseguir verde.
2. **Supabase staging:** falta una instancia alojada accesible para recompensas, deuda, reconexión, concurrencia e idempotencia. Proyecto conocidohugqjejfyyilslbomsgi; el acceso previo dio28P01 y no había rama staging accesible. No se aplicó DDL a ningún proyecto alojado. Conservar migración/reversión versionadas; no confundir PGlite/PostgreSQLlocal con este gate.
3. **Vercel Preview:** [45020275929](https://github.com/javierdario48-star/ATRIA/actions/runs/45020275929) no aceptó entrada real al preview. Falta deployment utilizable que corresponda exactamente al SHA probado; restricciones/cuota del proveedor previas están documentadas. Build preflight verde no sustituye el deployment ni justifica tocar Production.
4. **Android físico y multicuenta externa:** faltan dispositivo, red móvil, guardia completa y comunicación real. Pixel emulado y los procesos de QA no sustituyen esa aceptación. Registrar frase, UID, cola/recibo, latencia y SHA para cualquier fallo de Enfermería, chat, selección o Vega; no reimplementar una funcionalidad por un reporte antiguo sin reproducción vigente.

La próxima acción del creador es abrir el HTML y probarlo. La siguiente acción técnica independiente es concluir/reproducir QA-01 con la CI indicada; después seguir los bloques del inventario, priorizando evidencia de jugabilidad. No repetir40+550por una modificación documental o un problema de entorno.

## Publicaciones y reversión

[a1b291d](https://github.com/javierdario48-star/ATRIA/commit/a1b291de1d5ca641ec7a22b1e7c77c0da6d68d94): recepción y CIRR neto; [f74b672](https://github.com/javierdario48-star/ATRIA/commit/f74b672d9d7552eddfb8f25f2c997a603836a09c): receptor ciego; [63f7b65](https://github.com/javierdario48-star/ATRIA/commit/63f7b659146fd711289342e0aeb9a924748f41f3): Cardiología; [846632f](https://github.com/javierdario48-star/ATRIA/commit/846632fad72b0ed41a3f7c160ef2ac50d56c35d4): grafo/bots; [ef4b06f](https://github.com/javierdario48-star/ATRIA/commit/ef4b06f2e27ff9c8ab48c1330f032a97f3573d81): HTML/guardado; [31f15e8](https://github.com/javierdario48-star/ATRIA/commit/31f15e88cebff4ef7efd369e14e6a30fac373342): comprobación de cola viajando; [906e50e](https://github.com/javierdario48-star/ATRIA/commit/906e50e34fe815a616fb12daa74e3e3a167024b6): IDs de comandos tras recarga.

V1 sigue en el catálogo web y en `ATRIA-5-Solitario.html`; el piloto V2 solo se selecciona en su copia experimental. Reversión de contenido: usar V1 sin migración. Reversión de código: revertir commits concretos con revisión de dependencias; nunca reset/force-push ni borrar historial ajeno. Guardias offline se aíslan por SHA: conservar el HTML de la revisión original para recuperarlas. No hubo migraciones irreversibles, activación de Production ni cambios en main/V4.8.7/otras ramas.
