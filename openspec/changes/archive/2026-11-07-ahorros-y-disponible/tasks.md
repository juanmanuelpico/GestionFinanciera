# Tareas: Ahorros y dinero disponible

Estado al 4 de noviembre de 2026.

- [x] 1. Migración `add_savings_and_wallets`: `savings`, `savings_events`, `enabledCurrencies`, `headerCurrency` (S2, S4, S5)
- [x] 2. Backend `exchange-rates`: DolarApi blue/oficial/MEP con caché de 5 min y error controlado (S11)
- [x] 3. Backend `savings`: alta con movimiento, estimado, devolver, convertir, ajustar, historial (S5-S10, S14)
- [x] 4. Backend disponible por billetera y resumen por moneda (S1, S12, S13)
- [x] 5. Backend preferencias de ahorro y billetera del header, con validación de que la billetera esté habilitada (S1, S2)
- [x] 6. Frontend header con combo de billetera y disponible (S1)
- [x] 7. Frontend Configuración > Ahorros (S2)
- [x] 8. Frontend menú "Ahorros" después de "Movimientos" (S3)
- [x] 9. Frontend pantalla Ahorros: cotizaciones, resumen, listado, historial, alta y acciones (S6-S12, S15)
- [x] 10. Frontend dashboard con disponible y total de ahorros (S13)
- [x] 11. Tests de reglas de negocio backend (23 de ahorros/cotizaciones + 44 suite) y frontend (33 suite)
- [x] 12. Revisión mobile con `mobile-ui` (S15): correcciones aplicadas; verificación visual pendiente
- [x] 13. Typecheck, lint, test y build en backend y frontend
- [x] 14. Verificación de specs (ver `specs/ahorros-y-disponible/spec.md`)
- [x] 15. Verificación visual en navegador (320, 375, 390, 414 y 1280 px, claro y oscuro): dashboard, Ahorros y Configuración sin desborde horizontal ni errores de aplicación. La tabla de ahorros e historial hace scroll horizontal dentro de su tarjeta en mobile, según el diseño
- [x] 16. Prueba en vivo: DolarApi responde blue/oficial/MEP; flujo completo contra la API: alta con descuento, ajuste, conversión, devolución, validaciones y evento por acción. No se forzó el caso de DolarApi caído
- [ ] 16a. Pendiente de decisión: el alta permite dejar el disponible en negativo (el spec no lo prohíbe en S6)
- [x] 16b. Bug previo de autenticación: refresh concurrente genera el mismo `tokenHash` y devuelve 500 (ver nota en la sesión de verificación). Corregido el 7/11: el refresh token se firma con `jti` aleatorio (hashes siempre distintos) y la rotación pasó a ser atómica con `updateMany` condicionado a `revokedAt: null`; una segunda petición concurrente recibe 401 en lugar de 500. Tests: `backend/src/modules/auth/auth.service.spec.ts`
- Commits: los realiza el usuario (no es tarea del agente)

## Actualización 5/11/2026: totalizadores, historial único y filtros

- [x] 17. Migración `add_saving_event_snapshots`: cotización, impacto en disponible y observación por evento, con backfill de altas (S5, S17)
- [x] 18. Backend: una posición activa por moneda, alta acumulativa con cotización ponderada y consolidación de duplicados (S6, S16)
- [x] 19. Backend: acciones por moneda en `/savings/positions/:currency/adjust|return|convert` con devolución parcial (S8-S10, S16)
- [x] 20. Backend: historial con filtros por fecha/tipo/moneda/texto y paginación (S17)
- [x] 21. Frontend: "Agregar ahorro" en el encabezado y eliminación de la grilla de ahorros (S6, S16)
- [x] 22. Frontend: totalizadores con Ajustar/Devolver/Convertir y devolución parcial en la moneda de la posición (S8, S16)
- [x] 23. Frontend: historial único con Cotización y Movimiento Dinero Disponible firmado (`−` rojo / `+` verde) (S17)
- [x] 24. Frontend: filtros y paginación de a 20 en el historial (S17)
- [x] 25. Token `success` en `index.css` y documentación en `docs/ui/design-system.md` (S15)
- [x] 26. Tests backend (53) y frontend (38); typecheck, lint y build en verde
- [x] 27. Revisión mobile con `mobile-ui` sobre la pantalla de Ahorros (correcciones aplicadas)
- [ ] 28. Verificación visual en navegador 320/375/390/414 y 1280+, claro y oscuro

## Actualización 5/11/2026: conversión con importe y cotización de origen

- [x] 29. Backend: `ConvertSavingDto` con `amount`, `sourceQuoteType` y `sourceQuoteRate`; conversión parcial, fusión con destino y evento con la cotización de la moneda extranjera (S9, S17)
- [x] 30. Frontend: diálogo de convertir con importe y cotización de origen editable; preview y resto en la moneda original (S9)
- [x] 31. Tests backend (57) y frontend (39); typecheck, lint y build en verde
- [x] 32. Revisión mobile del diálogo de conversión con `mobile-ui` (correcciones aplicadas)

## Actualización 5/11/2026: devolución con cotización de origen e historial de conversiones

- [x] 33. Backend: `ReturnSavingDto` con `sourceQuoteType`/`sourceQuoteRate`; `returnToWallet` convierte con la cotización de origen elegida (S8)
- [x] 34. Backend: `SavingEvent.sourceAmount`/`sourceCurrency`, migración `20261105031928_add_saving_event_source`; `convert` guarda la moneda y el monto base (S17)
- [x] 35. Frontend: diálogo Devolver con bloque "Cotización de origen" cuando la billetera tiene otra moneda (S8)
- [x] 36. Frontend: historial con dirección origen → destino y línea secundaria `desde {monto} {moneda}` en conversiones (S17)
- [x] 37. Tests backend (58) y frontend (41); typecheck, lint y build en verde
- [x] 38. Revisión mobile de devolución e historial con `mobile-ui` (correcciones aplicadas)
