# ATRIA 4.8.7 — Cobertura funcional real: 30 entradas × 13 casos

**Rama:** `atria-4.8.7-grace-nursing-qa`. **Fecha:** 2026-10-11. Inventario del catálogo postarranque: 30 entradas. No confundir **entrada** con fármaco molecular; incluye clases y procedimientos.

**Estados**: **B1-S** = mecanismo B1 implementado, con pruebas de sombra, sin titularidad clínica por defecto; **B1-R** = Ringer B1 propietario reversible sólo en QA experimental local nuevo `PERI-SEC-001`; **N** = continúa bajo lógica nativa, sin intervención B1 validada; **B** = bloqueo específico de instalación farmacológica global. Ningún estado indica validación médica cuantitativa ni dispositivo/navegador probado.

| # | Entrada nativa | Categoría / mecanismo | Estado real |
|---:|---|---|---|
| 1 | `oxygen` | Soporte respiratorio | B1-S; nativo activo, checkpoint C confirma doble ruta y ausencia de stop ejecutado; migración BLOQUEADA |
| 2 | `fluid` | Cristaloides / Ringer identificado | B1-R exclusivamente en QA limitado; N por defecto |
| 3 | `albumin` | Coloide / volumen | N |
| 4 | `vasopressor` | Vasopresores; identidad noradrenalina requerida | B1-S; N por defecto |
| 5 | `morphine` | Opioide | B1-S; N por defecto |
| 6 | `analgesia` | Orden genérica analgésica | N; no identificar automáticamente molécula sin evidencia |
| 7 | `antiemetic` | Orden genérica antiemética | N; no identificar automáticamente molécula |
| 8 | `ppi` | Inhibición ácida / clase | N |
| 9 | `transfusion` | Hemoderivados | N |
| 10 | `paracentesis_ter` | Procedimiento terapéutico | N; realizar ≠ ordenar |
| 11 | `espironolactona` | Diurético ahorrador de potasio | N |
| 12 | `steroid` | Orden genérica corticosteroide | N |
| 13 | `aza` | Azatioprina / inmunomodulación | N |
| 14 | `ceftriaxone` | Antibacteriano | N |
| 15 | `metronidazole` | Antibacteriano / anaerobios | N |
| 16 | `imipenem` | Antibacteriano | N |
| 17 | `ceftazidime` | Antibacteriano | N |
| 18 | `cefoperazone` | Antibacteriano | N |
| 19 | `cefepime` | Antibacteriano | N |
| 20 | `piptazo` | Antibacteriano | N |
| 21 | `ampicillin` | Antibacteriano | N |
| 22 | `amikacin` | Antibacteriano | N |
| 23 | `gentamicin` | Antibacteriano | N |
| 24 | `fluconazole` | Antifúngico | N |
| 25 | `amphotericin` | Antifúngico | N |
| 26 | `source_control` | Procedimiento/control del foco | N; requiere confirmación de ejecución |
| 27 | `stop_beta_blocker` | Suspender fármaco, no bolo | N |
| 28 | `furosemide` | Diurético de asa | B1-S; N por defecto |
| 29 | `beta_blocker` | Betabloqueantes / clase | N |
| 30 | `anticoagulation` | Heparina IV V19 | B; mecanismo coagulación/exposición no validado |

**Resumen de cobertura**: 5/30 entradas con mecanismos B1 experimentales, pero solo una (`fluid` = Ringer IV explícitamente identificado) tiene propietaria fisiológica clínica **opt-in** probada en VM, apagada por defecto; las otras cuatro siguen modeladas sólo en sombra. 25/30 sin migración B1. **No** declarar 5/30 integradas clínicamente. La presencia de las restantes entradas en el juego nativo no certifica que dispongan de farmacología funcional conforme a esta arquitectura.

**Casos:** B1 dispone de perfiles experimentales `PERI-SEC-001`, `HDA-001` y `CIRR-001` (3/13). Los 10 restantes no cuentan con perfil B1 integrado. Ringer propietaria experimental se restringe a `PERI-SEC-001`. No hay pruebas completas de combinaciones B1 en el navegador.

**Checkpoint C (oxígeno):** [frontera y bloqueo](ATRIA_487_B1_FUNCTIONAL_CHECKPOINT_C_OXYGEN_OWNER_BOUNDARY.md). La verificación de la suspensión textual demuestra ausencia de ejecución, no un stop confirmado. Aún no hay nuevo propietario terapéutico.

**Ejecuciones presentes:** [Ringer A](ATRIA_487_B1_FUNCTIONAL_CHECKPOINT_A.md), [oxígeno B](ATRIA_487_B1_FUNCTIONAL_CHECKPOINT_B_OXYGEN_PREFLIGHT.md) y [auditoría independiente](ATRIA_487_RINGER_INDEPENDENT_CLINICAL_AUDIT.md).

**Secuencia próxima eficiente:** aislar responsabilidad de oxígeno (vital directo + rescate) y comprobar inicio/cambio/suspensión antes de activarlo. Luego considerar noradrenalina, morfina y furosemida reutilizando mecanismos existentes; finalmente grupos clínicos prioritarios como antibióticos y foco quirúrgico. No reconstruir otro motor.
