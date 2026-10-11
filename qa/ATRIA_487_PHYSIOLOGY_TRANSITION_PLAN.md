# Physiological transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demostrar si Ringer/PERI-SEC puede tener un único responsable sin modificar rescate, supervivencia ni Cirugía; completar sólo los contratos necesarios.

**Architecture:** Reutilizar el adaptador de recibos y el observador CP1. Añadir recibos estrictos v2 con identidad de formulación y episodio, manteniendo v1/B1. Los intentos de sustitución se prueban exclusivamente en VM; si dejan aportes antiguos o alteran protecciones, no se instala un escritor clínico.

**Tech Stack:** JavaScript ESM, Node assert/VM y build existente; ninguna dependencia nueva.

**Spec:** Solicitud de transición clínica de 2026-10-11; rama `atria-4.8.7-grace-nursing-qa`, referencia `ea75c6153c957b6a0e9d9bf645bd85ac37455ca3`.

## Global Constraints

- No reconstruir CP1 ni infraestructura general; no implementar los otros 25 tratamientos.
- No modificar producción, golden master, Supabase, XP, cirugía ni multijugador.
- Conservar protección contra muerte temprana y rescate; si no se aíslan, mantener sombra.
- Commit reversible, suite completa, build, artefacto y CI exacto antes de cerrar checkpoint.

## Review Focus

- Un recibo de dosis no establece formulación: rechazar identidad ausente o discordante en v2.
- Titración/suspensión sin inicio, con otro episodio o predecesor: rechazar sin inferir.
- Una dosis repetida no debe abrir una segunda exposición ni borrar un bolo previo.
- Reemplazar sólo el bolo deja aportes de rescate/puente: reproducir con código nativo actual.
- Ocultar el historial o revertir una referencia no revierte la trayectoria: verificar evidencia y rollback de sombra, sin prometer rollback clínico.

## Task 1 — Contrato existente

**Files:** `src/integration/pharmacology-receipts-487.js`, su test y, únicamente para conservar la identidad del recibo v2, `src/clinical/physiology-pilot-487.js`.

**Interfaces:** `adaptConfirmedPharmacologyEvents487(events, context)` conserva v1. V2 exige `formulation`, `episodeId`, `previousEventId` y un historial completo de confirmaciones del episodio. Devuelve los mismos eventos numéricos con procedencia de contrato verificable.

- [x] Escribir pruebas de identidad/revisión, inicio/titulación/suspensión entre lotes, historia incompleta, repetición e inmutabilidad.
- [x] Verificar RED por rechazo de schema v2.
- [x] Implementar el cambio mínimo en el adaptador y preservar la clave de ejecución en la procedencia del núcleo, sin cambiar ecuaciones.
- [x] Ejecutar pruebas específicas, equivalencia B1, suite completa, build/artefacto y commit (`3d278b6`, CI38142424357 SUCCESS).

## Task 2 — Prueba de transición y bloqueo

**Files:** `src/integration/physiology-transition-487.test.js`, `package.json`, informe/checkpoints QA.

**Interfaces:** Reutilizar `createLiveNativeJourney487`, el observador CP1 y las políticas clínicas existentes. Ningún nuevo endpoint clínico.

- [x] Inventariar escritores y consumidores con rutas, condiciones y orden efectivo.
- [x] Probar desde enfermería que cambiar sólo el bolo conserva el aporte antiguo de rescate.
- [x] Probar que ocultar Ringer del ledger cambia evidencia de rescate/supervivencia/puente.
- [x] Comparar estado completo ON/OFF y rollback de sombra, incluyendo Maps/Sets y relojes protegidos.
- [ ] Registrar el bloqueo concreto, ejecutar suite/build/artefacto y publicar con CI verde.

La sustitución real sólo continúa si estas pruebas demuestran aislamiento. No autoriza copiar ganancias de rescate al mecanismo B1, fabricar recibos de suspensión, ni modificar procedimientos protegidos.

## Registro de decisiones y revisión

- Task1 complete:22 controles de recibos,30.351 comparaciones B1, suite/build/artefacto y CI exacto verde; no cambios numéricos. Revisión fresca con skill requesting-code-review detectó dos fallos importantes entre lotes. Ambos fueron reproducidos RED→GREEN y corregidos: protocolo v2 persistente e historia verificada contra el índice existente. Se añadió también el contraejemplo de bolos independientes; se limita exclusividad a soporte/infusión.
- Ruling: mantener el observador v1 y no fabricar metadatos de ejecución v2 — el ledger nativo no los demuestra — coste de error: una formulación/vía o suspensión falsa podría habilitar un efecto real incorrecto.
- Ruling: detener activación Ringer — la traza demuestra una segunda contribución de rescate protegido y el puente comparte su evidencia — coste de error: duplicar efecto o alterar rescate/pase. Los experimentos de sustitución quedan sólo en la VM de test.
- Ruling: rollback sólo de sombra; no prometer revertir un paciente modificado restaurando una referencia — el estado evoluciona y no hay replay clínico aceptado — coste de error: discontinuidad y riesgo vital oculto.
- Minor de revisión resuelto: preflight añadido a `npm test` en checkpoint2b. Ningún minor diferido. Último gate de publicación/CI2b se verifica al entregar, sin presumir un SHA o un CI propio dentro de este documento.
