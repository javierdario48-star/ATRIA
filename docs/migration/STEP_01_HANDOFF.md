# ATRIA 5.0 — C01 — Consolidación de la versión móvil aprobada

**Estado:** cambios ejecutables integrados sin conflictos. **Código funcional** `0b36884fa4a879d49c588fa8f3f262a535dd3070`, CI de este SHA [38836248252](https://github.com/javierdario48-star/ATRIA/actions/runs/38836248252) **success (3/3)**. Los commits de informes posteriores solo añaden documentación; antes de continuar confirmar HEAD remoto y su CI.

## 1. Misión y decisión adoptada

Usuario aprobó en Android la versión V5 con teclado ATRIA compacto, cámara adelantada y movimiento corregido, así como cambio de ropa sin retorno a spawn; pidió conservar código limpio, sin parches y con informes para continuación. La acción C01 fue consolidarla sobre `atria-5.0-core-rebuild-experimental` como base de la migración, manteniendo intacta producción/estables.

Se eligió **fast-forward estricto** en vez de cherry-pick masivo, merge con resolución manual o copia de archivos. El cambio aprobado era ancestro-descendiente puro.

## 2. Referencias remotas exactas

- Repositorio: `javierdario48-star/ATRIA`.
- Rama de desarrollo: `atria-5.0-core-rebuild-experimental`.
- HEAD anterior a C01: `646a0ab3f19991ce4e4c4239760db6bfb17c18a1`.
- Recuperación inmutable por rama: `atria-5.0-recovery-before-approved-ui` en el SHA anterior.
- Rama fuente aprobada: `atria-5.0-compact-keyboard-preview`, HEAD `0b36884fa4a879d49c588fa8f3f262a535dd3070`.
- Comparación antes de FF: `ahead_by=29`, `behind_by=0`, 18 rutas cambiadas, `status=ahead`.
- Operación ejecutada: `update_ref(branch=atria-5.0-core-rebuild-experimental, sha=0b36884..., expected_sha=646a0ab..., force=false)`; respondió `success=true`.
- CI comprobada para código aprobado: [38836248252](https://github.com/javierdario48-star/ATRIA/actions/runs/38836248252). Trabajos `clean-core-contract`, `independent-game-browser`, `preserved-historical-regression` completos success.
- Preview del código aprobado y evaluado por el usuario: https://night-shift-clinical-a8s9vkw0p-javierdario4878-7324.vercel.app/ — despliegue READY `dpl_DebVvtWhBEaorRnJ6rFwuaaqdRnP`, metadata SHA idéntico a código anterior.
- No usar un deploy de un SHA distinto como evidencia de C01.

## 3. Archivos ejecutables integrados (sin modificaciones funcionales adicionales en C01)

- `src/v5/ui/atria-keyboard.js`, `src/v5/ui/atria-keyboard.test.js`: teclado cuatro filas en español con ñ, edición en caret, tecla enviar, `inputmode=none` y destrucción de listeners.
- `src/v5/render/hospital.js`: región visible como ancla de cámara, alineación píxel físico, restitución del centrado original al ocultar teclado.
- `src/v5/render/presentation-timeline.js`, `.test.js`: interpolación read-only entre pasos del scheduler fijo, no altera estado clínico ni colisiones.
- `src/v5/app/world.js`, `.test.js`: `setAppearance` modifica jugador existente, preserva posición, ruta, nivel, fase y generación.
- `src/v5/app/application.js`: integra teclado y vista interpolada con lifecycle y perfil; al guardar color/alias ya no reinstancia mundo.
- `src/app/frame-scheduler.js`: expone alpha de presentación, conserva simulación a 60Hz.
- `src/v5/web/index.html`, `game.css`: presentación responsive aprobada.
- `qa/v5/keyboard-camera-browser.mjs`, `qa/v5/{navigation,studies,cirr,app}-browser.mjs`: QA UI y proyección real de cámara para clics.
- `package.json`, `.github/workflows/atria-v5-core.yml`: incluye contratos y rama de preview, sin quitar regression histórica.

## 4. Verificaciones y limitaciones

- `npm run test:v5` más suite `node --test src/v5/ui/atria-keyboard.test.js` (en workflow).
- `npm run build:v5` y `npm run build:v5-core` byte reproducibles.
- Playwright/Chromium real con Pixel 5 emulado y desktop/landscape, cambio de ambo sin pérdida de ubicación, chat, estados de guardia, estudio, CIRR completo (100/100, 133 XP) y APP completo, comparación mapa legado con teclado oculto.
- `npm test` y `npm run build` de 4.8.7, golden master protegidos: CI success.
- Aprobación en Android físico informada por el usuario: teclado, caminata y cambio de ambo funcionan. **No** constituye una batería multi-dispositivo de rendimiento ni certificación de todas las funciones V5.
- V5 aún no incorpora examen físico detallado original, chat/diálogo pleno, voz, tutor Vega, enfermería completa, los once casos completos faltantes ni multijugador autenticado. No se considera 5.0 terminada.
- Tras C01 se crearon nuevos archivos solo documentales: `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md`, `docs/migration/STATUS.md` y el presente informe. No atribuir el CI del SHA funcional a un futuro SHA documental sin verificar corrida aparte.

## 5. Recuperación independiente del historial del chat

1. Verificar `GET https://api.github.com/repos/javierdario48-star/ATRIA/branches/atria-5.0-core-rebuild-experimental` y comparar su HEAD con este estado; leer `docs/migration/STATUS.md`.
2. Revisar `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md` para los **25** checkpoints y sus puertas de seguridad.
3. Para ejecutar checks con Node 22: `npm run test:v5`; `node --test src/v5/ui/atria-keyboard.test.js`; `npm run build:v5`; `npm run qa:v5-browser` (Playwright/Chrome según `qa/v5/browser-harness.mjs`); `node qa/v5/keyboard-camera-browser.mjs`; `node qa/v5/cirr-browser.mjs`; `node qa/v5/app-browser.mjs`; `npm test`.
4. No restaurar `646a0ab` con una escritura forzada a la rama de desarrollo: el punto de recuperación está protegido en su rama separada. Cualquier retroceso o corrección exige comprobar SHA HEAD y documentar efecto.
5. Si la CI del HEAD actual falla, corregir solo la causa reproducible; no iniciar C02 dando por cerrada una regresión.

## 6. Instrucción exacta para siguiente agente: C02

> Continúa ATRIA 5.0 en `javierdario48-star/ATRIA`, rama `atria-5.0-core-rebuild-experimental`. Lee `docs/migration/STATUS.md`, `docs/ATRIA_50_MIGRATION_MASTER_PLAN.md` y este `docs/migration/STEP_01_HANDOFF.md`. Verifica SHA remoto/CI antes de escribir. Próxima misión C02: elaborar matriz completa de comportamientos originales, dependencias y equivalencia funcional de los 13 casos y sistemas sociales/voz/enfermería/Vega, con fuentes y pruebas de referencia, sin reconstruir CIRR/APP ni tocar teclado/cámara/movimiento. Al acabar C02, crea `docs/migration/STEP_02_HANDOFF.md`, actualiza `STATUS.md`, verifica CI y preview cuando corresponda. Mantén producción y vendor intactos.

**Siguiente checkpoint:** C02. **No se ha iniciado C02 como implementación.**
