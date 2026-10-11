# ATRIA 4.8.7 — B1 Checkpoint A: Ringer educativo simplificado

**Rama**: `atria-4.8.7-grace-nursing-qa`. Referencia de partida `cfbbbf9cb97eeca4a4c84a73748f153d08b13b3c`, CI inicial `38156402353` SUCCESS.

**Implementación**: `src/integration/physiology-ringer-owner-487.js`, versión de propietario experimental `b1-volume-v2`. Se conserva el mecanismo B1 `volume.receipt` con su fracción inicial 25/75 y el historial nativo de 30 entradas. No se modifica ningún parámetro del B1 congelado, la evolución natural de sepsis, los escritorios ajenos, rescate, gracia ni cirugía. El propietario B1 continúa **OFF por defecto** y limitado a un nuevo ingreso local `PERI-SEC-001`.

**Cambio mínimo de comportamiento**:
- El volumen intersticial **atribuido al bolo** disminuye continuamente con una semivida educativa acotada dependiente de la reserva renal (`36+84*(1-renalReserve)` minutos nativos). No se presenta como diuresis medida, eliminación farmacocinética validada ni balance hídrico completo.
- El riesgo respiratorio B1 sólo puede convertirse en penalización por sobrecarga si existe **congestión del volumen efectivo actual** (`clamp((effectiveVolume-.85)/.22,0,1)`). Se conserva el riesgo B1 contextual, modulado por reserva renal. Esto evita equiparar registro histórico de ml intersticiales con edema pulmonar demostrado durante hipovolemia profunda.
- La circulación y el descenso por pérdidas de infección siguen controlados por fisiología nativa; un bolo sigue aplicándose una única vez. No se inventan curaciones, créditos de gracia ni presión arterial.
- Los coeficientes de simulación son aproximaciones docentes, **no recomendaciones de dosificación ni predicciones clínicas exactas**.

**Verificación**: CI [38161086624](https://github.com/javierdario48-star/ATRIA/actions/runs/38161086624) SUCCESS sobre `24fdbceeba1da8ef89922a16179b20aad5965d67`, incluyendo 14 controles de titularidad (uno adicional para congestión contextual), 17 bots de flujo nativo/enfermería, rescate, B1 congelado, regresiones históricas, build y artefacto. El bot independiente corre ocho trayectorias y sus invariantes continuaron verdes **sin modificar el oráculo**.

**Evolución medida (PERI-SEC, volumen efectivo inicial 0,45, t=10 s reales)**:
- Sin Ringer, PAM 52,24 mmHg, SpO₂ 91,81%.
- Ringer 500 ml, PAM 53,51, SpO₂ 91,81%. Antes de este cambio SpO₂ 90,81%; ahora no hay penalización automática de congestión en hipovolemia profunda.
- Ringer 3000 ml, PAM 59,90, SpO₂ 91,81% en este perfil aún hipovolémico. Exceso de fluidos **puede** causar daño en los perfiles inicialmente repletos, no es universalmente inocuo.
- Paciente inicialmente repleto, 3000 ml: a 30 s SpO₂ ~84,49% frente a ~90,52% con 500 ml, dentro de las cifras internas del simulador. No son predicciones clínicas validadas.

**Alertas independientes que quedan**: cuatro, de las cuales una es alta: fracción de distribución B1 inmediata ~75% intersticial y ausencia de duración explícita de la infusión; dos son moderadas (piso de shock que converge y nula distinción de riesgo pulmonar tras un único bolo en déficit renal), y una de contexto (500 ml no alcanzan PAM65 en shock). La advertencia de reparto instantáneo se acepta *como simplificación del bolo* **para QA experimental únicamente**; la puerta estricta `npm run qa:ringer-clinical-gate` continúa bloqueada y no debe describirse como aprobación médica. Desaparecieron las seis alertas de penalización pulmonar y falta de recambio temporal.

**Límites**: no hay validación clínica cuantitativa, navegador gráfico ni Android físico. No hay parametrización general de infusiones, balance ácido-base, electrolitos ni dosis máximas clínicas. Antes de extender Ringer a nuevos casos se requiere revisar la plausibilidad contextual y ensayar la admisión visual en QA.

**Siguiente checkpoint**: auditoría de escritores, administración, inicio/cambio/suspensión y fronteras de rescate de O₂. Sólo transferir propiedad si existe evidencia nativa suficiente; no extender el propietario Ringer a oxígeno mediante un wrapper que duplique efectos.