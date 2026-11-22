# ATRIA 5.0 — resultado de la continuación y certificación RESP-01 V2

**Decisión: NO GO.** RESP-01 V2 conserva su certificación automatizada de contenido; faltan la recepción ciega y la aceptación de plataforma. ATRIA 5.0 tampoco está certificado para lanzamiento general. No se activó V2 ni se modificó Production, `main`, ATRIA 4.8.7 u otro proyecto.

Fecha de trabajo: 21/11/2026, Buenos Aires (los registros de GitHub aparecen el 22/11 UTC). Rama exclusiva: `atria-5.0-core-rebuild-experimental`. Se partió de `bc4fb505bf5cf4f17d73d9311fa4a24cf12f05f5`, confirmado contra el remoto. Último código publicado: **`629a33ba2a529ade4c30c5501c25a6d23ead40e8`**. El commit que publique este informe será documental y posterior; no sustituye los SHA de prueba.

## Qué quedó hecho

| Solicitud | Resultado verificable | Lo que falta |
| --- | --- | --- |
| A1. XP Cooperativo | Pistas y revelación aplican el coste al equipo activo; contenido revelado privado. Errores conservan autor y cohorte; dos autores generan costes distintos. Carrera local conecta Alta, Observación y muerte al ledger existente. Pruebas 2/3/4 miembros, ausencia, repetición y recuperación. | Certificar cuentas alojadas, deuda de carrera y muerte causal con red/concurrencia reales. No declarar sincronización Supabase por un test de memoria. |
| A2. Receptores ciegos | **NO RESUELTO.** Dos contraejemplos ejecutables fallan. Con la misma información clínica documentada, cambiar solo la etiqueta diagnóstica oculta altera la decisión receptora. | Integrar la política pública sin perder preparación, urgencia, rescate y continuidad. El intento de integración que rompía esas reglas se revirtió y nunca se publicó. |
| A3. Alta/Observación inseguras | Reprimenda, −15, paciente intacto, recuperación y recibo único verificados en pruebas nativas. Se corrigió el cierre de Observación mientras Enfermería todavía estaba trabajando. | Aceptación de la sanción y deuda con cuentas reales en staging y teléfono. |
| A4. Medicación/dosis/alergias/iatrogenia/rescate | Regresiones nativas y contrato V2 aprobados. PBE conserva daño renal medido y rescate posterior; no se cambió fisiología para obtener verde. | Aceptación externa del mismo backend. No se certifica toda formulación futura ni las otras 54 revisiones V2. |
| B5. Regresiones V1 | CIRR conserva 133 brutos −15 = 118 netos tras Alta insegura. DIARR reconoce la reprimenda de Observación. NEUR-03 solicita su receptor y vuelve a cerrar con Vega. Los 10 perfiles de traslado ×55 casos aprobaron en CI. | Aceptación del escenario CIRR de navegador corregido y CI general del último código; consultar sus enlaces antes de repetirlo. |
| B6. Perfiles históricos | 550 recorridos de traslado aprobados. Matriz longitudinal histórica de 10 perfiles por caso lanzada con evidencia de paciente, tratamiento, estudios, recuperación y desenlace. | Consultar la finalización de la matriz: un recorrido completo con desenlace adverso legítimo no equivale a un certificado clínico exitoso. Ver checkpoint de evidencia. |
| B7. RESP-01 V2 y paridad | **40/40 escenarios y 15 pares V1/V2 sin errores; 5/5 trabajos verdes** en el mismo SHA `78f260f`. La aprobación original `44968933396` se conserva como aprobada. | La integración posterior de carrera local requiere CI/aceptación de su propio SHA. La fisiología y el contenido de los casos no cambiaron después de `ef95901`. |
| C8. Supabase | Migración preparada, no aplicada. 9/9 pruebas PostgreSQL local también verdes en CI: cuatro modos, cohortes, deuda, dos autores, muerte causal, idempotencia y permisos. | Staging separado y accesible; Auth/PostgREST, concurrencia/CAS y reconexión. Adaptador REST de deuda de carrera pendiente del despliegue versionado. |
| C9. Build y Vercel | Corregido módulo ausente del build compacto. Build modular aprobado: 220 módulos; frontera estructural aprobada. Configuración del repositorio coherente con `out-v5`. | Vercel rechaza deployments; no hay Preview del SHA probado. Un deployment antiguo READY no sirve como aceptación. |
| C10. Multijugador/Android | CI anterior aprobó navegador autenticado, equipos de 3/4, HTTP multijugador, guardia completa en bots y recuperación durable. | Repetir solo lo afectado contra el backend alojado y el SHA final; guardia de 24 minutos, continuación/salida, Enfermería, comunicación, controles y teclado en Android físico. Emulación no certifica dispositivo real. |

## Commits publicados

| SHA | Cambio real |
| --- | --- |
| [`f6acbe7`](https://github.com/javierdario48-star/ATRIA/commit/f6acbe7a98d0ccfe0ab9edb915453214fec74a7b) | Distribuir coste de pistas/revelación y cohortes de sanciones sin alterar calidad clínica. |
| [`7a29b28`](https://github.com/javierdario48-star/ATRIA/commit/7a29b280711721f1d0a33cd61ba3f7102401ecca) | Empaquetar `medication-indication-review.js`; corregir verificaciones bruto/neto de CIRR y recibo de Observación DIARR. |
| [`ef95901`](https://github.com/javierdario48-star/ATRIA/commit/ef959019039eeb6380f5a7f5dd670aad55f7b993) | Recuperar Observación con receptor; previsualizar reevaluación sin escribirla ante rechazo; impedir cierre con Enfermería pendiente. |
| [`78f260f`](https://github.com/javierdario48-star/ATRIA/commit/78f260f5509c3f73106c82854f1b28bf034228d9) | Migración de recompensas + pruebas PostgreSQL local; contraejemplo preciso de recepción ciega; instrucciones de staging/reversión. |
| [`5a5d20e`](https://github.com/javierdario48-star/ATRIA/commit/5a5d20e717f092c6556526f276ffb90353a57046) | Corregir la misma expectativa bruto/neto en el escenario CIRR de navegador y persistencia tras recarga. |
| [`629a33b`](https://github.com/javierdario48-star/ATRIA/commit/629a33ba2a529ade4c30c5501c25a6d23ead40e8) | Conectar todas las sanciones elegibles a la carrera local; conservar autor, dos errores distintos y nombre de Observación en la notificación. |

Los cambios posteriores a `ef95901` no modifican fisiología, reglas de cierre ni contenido clínico. La integración de interfaz sí cambió; debe aceptarse como tal. No se utiliza esa equivalencia para afirmar que todas las pruebas del SHA final ya están verdes.

## Pruebas y CI

| Evidencia | Resultado / alcance |
| --- | --- |
| [Certificación original `44968933396`](https://github.com/javierdario48-star/ATRIA/actions/runs/44968933396), `d38cfcc` | 5/5 trabajos y 40/40 V2 aprobados. Se verificó directamente; no es un pendiente recuperado. |
| [V2 `44973929079`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973929079), `78f260f` | 5/5 verdes. Log: `scenarioCount:40, passed:40, errors:[]`. Paridad: 15 pares, `errors:[]`. |
| [Traslados `44973637288`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973637288), `ef95901` | 11/11 trabajos: regresiones +10 perfiles ×55 casos. No convierte los rechazos médicos esperados en fallos de software. |
| [Vega `44973637286`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973637286), `ef95901` | 2/2 trabajos; 55 recorridos y menú de paciente en navegador/emulación. NEUR-03 ya termina. |
| [SQL `44973929154`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973929154), `78f260f` | 9/9 PostgreSQL **local**. No certifica Supabase alojado. |
| Regresión local `npm run test:v5`, `78f260f` | **3210/3210; cero fallos, cancelaciones y omisiones**. Node 24.22.3. Después: 14/14 dirigidas para integración de carrera local y ledger en `629a33b`. No sumar ambas como pruebas únicas. |
| Pruebas dirigidas de receptor/observación | 102/102 relacionadas; 49/49 Enfermería/decisiones inseguras/recuperación; son grupos parcialmente superpuestos. |
| [Matriz longitudinal `44973637290`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973637290), `ef95901` | Revisar checkpoint final antes de relanzar. La copia local usa el mismo digest clínico y otro SHA de envoltura documental. |
| [CI general final `44974712154`](https://github.com/javierdario48-star/ATRIA/actions/runs/44974712154), `629a33b` | Pendiente de conclusión al preparar este informe. No declarada verde. El job CIRR corregido requiere aceptación aquí. |
| [CI general anterior `44973637282`](https://github.com/javierdario48-star/ATRIA/actions/runs/44973637282), `ef95901` | Falló navegador CIRR por `118 !== 133`; cambio de test en `5a5d20e`. La evidencia verde de otros jobs se conserva, sin aprobar el run entero. |
| `node --test qa/v5/release-gates/blind-receiver.test.mjs` | **0/2; bloqueo real abierto**, separado de certificación de contenido V2. |

El primer barrido local previo fue 3206/3209. Se investigaron sus tres fallos: lista antigua de nueve perfiles, texto de aviso PBE y cierre anticipado con Enfermería. El último era un defecto de ejecución; no se lo ocultó modificando el test. Los 3210 resultados posteriores corresponden al código corregido.

## Checkpoint persistente de la matriz longitudinal

Se conservan **200 de los 550 recorridos longitudinales** en [`native-partial-checkpoint.jsonl.gz`](../evidence/resp01-v2-release-2026-11-21/native-partial-checkpoint.jsonl.gz): expediente, acciones, administraciones, resultados, desenlace, restauración y recibos, sin modificar al paciente para construir evidencia. **No es una matriz completa ni una aprobación de los 350 restantes.** La matriz de traslados 550/550 citada arriba es otra campaña.

El verificador existente aprobó los 200, sus identidades, hashes y digest de dependencias clínicas `c2b79c149e51804883d42175a43af63fd535d9a190481fccd9f8df72caf606f5`. SHA-256 del archivo comprimido: `fda16d9fc35317d74110ac3dc52f0bb879b330660a56549857af1313e7782327`. La copia local continuaba produciendo filas y la CI de ocho fragmentos seguía ejecutándose al tomar este checkpoint. El informe no suma resultados de campañas duplicadas ni los convierte en certificados estrictos.

Primero consultar `44973637290` y descargar sus ocho artefactos si terminaron. Solo si falta evidencia, el checkpoint permite reanudar filas sin repetir las completas:

```bash
node qa/v5/clinical-integral-ci-shard.mjs 0 8 --checkpoint docs/evidence/resp01-v2-release-2026-11-21/native-partial-checkpoint.jsonl.gz --verify-only
# Para completar un fragmento, quitar --verify-only. Fragmentos válidos: 0 a 7.
```

El verificador rechaza un checkpoint si cambian las dependencias clínicas; no usarlo para aprobar un nuevo motor sin ejecutarlo. Un digest igual conserva evidencia de código clínico igual, pero no sustituye la aceptación del SHA de interfaz/backend final.

## Bloqueos externos comprobados

- **Supabase:** proyecto ATRIA `hugqjejfyyilslbomsgi`, ramas staging accesibles `[]`; lectura de metadatos falla con `28P01 password authentication failed`. No se aplicó SQL ni se creó infraestructura con coste. Procedimiento y reversión: [REWARD-MIGRATION-STAGING](ATRIA-5-REWARD-MIGRATION-STAGING-2026-11-21.md).
- **Vercel:** proyecto `night-shift-clinical`, `prj_trnID7kAMQkegKIKd8Aeqp7oy1gB`. Estado de commit fallido con referencia a bloqueo de despliegue de cuenta; consulta de deployments del SHA examinado devuelve cero. No se cambió el plan ni se activó Production.
- **Android físico:** no hay dispositivo físico conectado ni evidencia nueva de esa aceptación. No se infiere desde Playwright.
- **Navegador local de QA:** Chromium aborta por `socket() failed: Operation not permitted`. El escenario corregido se verifica en Actions. La sesión de navegador de GitHub está sin login; no permitió cancelar runs anteriores. No se eliminaron evidencias ni se fingió cancelación.

## Próxima acción concreta

1. **ChatGPT normal:** consultar los runs enlazados y el checkpoint persistente antes de repetir campañas. Resolver recepción ciega en `surgical-consultation.js`, `consultation-evidence.js` y `public-receiver-policy.js`: separar conocimiento público/expediente comunicado de la evaluación oculta del caso, preservando el único ejecutor nativo. Primero hacer pasar los dos contraejemplos; después pruebas dirigidas de disección con hipotensión/rescate, taponamiento, colangitis, pancreatitis, íleo, endoscopia y Observación con receptor. No desactivar controles ni introducir excepciones por `caseId`.
2. **Mixta, bloqueada por acceso:** restaurar Supabase staging y certificar la migración, deuda entre sesiones, 2/3/4 cuentas, peticiones paralelas y recibos únicos. Incorporar proyección REST de deuda junto con el esquema versionado, sin romper cuentas con esquema anterior.
3. **Work/aceptación externa:** recuperar Preview de Vercel del SHA exacto, verificar identidad del deployment y probar la guardia completa en teléfonos y multicuenta. No usar Work para refactorizar módulos o ejecutar unidades que ChatGPT normal puede resolver.

Mantener **NO GO** hasta cerrar esas puertas y obtener los trabajos obligatorios verdes del mismo SHA. Migrar las otras 54 enfermedades a V2 es posterior.

## Reversión y continuidad

V1 sigue disponible y V2 permanece como contenido candidato aislado. No hay migración alojada que deshacer. Ante regresión de código, revertir mediante nuevos commits pequeños en la rama experimental; conservar los contratos JSON 1.0.0–1.0.3 y los recibos. No resetear el remoto ni sobrescribir cambios concurrentes. Después de una migración futura, usar el procedimiento de staging citado; no borrar deuda o recibos para volver a un aspecto anterior.

Este informe sustituye las conclusiones operativas antiguas que decían «36 escenarios/no aprobado». Las secciones históricas de los inventarios se conservan como historial, no como estado actual.
