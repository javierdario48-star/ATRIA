# ATRIA 5.0 — Instrucciones de desarrollo (rama experimental)

Al implementar, importar o modificar un caso clínico en ATRIA 5.0, **leer y aplicar** `docs/ATRIA-5-CASE-INTEGRATION-CONTRACT.md` antes de editar código. Las cinco capas obligatorias son fisiología causal/temporal, contenido clínico y cierre, variabilidad clínica, alergias/seguridad farmacológica y personalidad/anamnesis. Validar con bots reales y regresión. No dar por terminado un caso por tener solo síntomas y tratamiento.

Trabajar únicamente en `atria-5.0-core-rebuild-experimental`; no tocar `main` ni ATRIA 4.8.7. Respetar la autoridad clínica existente, evitar motores paralelos y publicar checkpoints pequeños con CI verificable.

## Continuidad obligatoria
Leer también [docs/ATRIA-V2-CONTINUIDAD.md](docs/ATRIA-V2-CONTINUIDAD.md) para alcance, versiones, decisiones, pruebas y bloqueos. No confundir evidencia de un SHA con otro. No desplegar ni activar candidatos sin autorización y puertas de calidad. Para nuevas revisiones reutilizar `src/v5/content/packs/v2-revision-template.js`; las reglas clínicas se declaran en datos, nunca en una bifurcación por ID del motor.
