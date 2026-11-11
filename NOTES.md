# NOTES

## Tiempo
- Inicio: 2026-11-10 17:07
- Fin: 2026-11-10 19:27
- Duración: 2 h 20 min

## Qué hice

### Backend
- Completé las reglas de `orders.service.ts`:
  - Validación de evento y tipo de entrada.
  - Rechazo de items vacíos, cantidades inválidas y `ticketTypeId` duplicados.
  - Validación de `remaining` y `maxPerOrder`.
  - Cálculo de subtotal, cargo del 10% con `Math.round` y total en centavos.
  - Descuento de inventario solo después de validar toda la orden.
  - Confirmación únicamente para órdenes en estado `pending`.
- Resultado: 13/13 tests pasando.

### Frontend
- Checkout con `react-hook-form` + Yup.
- Validación de nombre y correo.
- Resumen de compra con entradas, subtotal, cargo y total.
- Creación de orden con `useApiMutation` y `createOrder`.
- Confirmación automática con `confirmOrder`.
- Manejo de errores de la API y estado de envío.
- Pantalla de confirmación en `/orders/:id` con datos reales de la orden.
- La confirmación carga la orden por id, por lo que funciona al recargar.
- No se agregaron dependencias.

## Decisiones técnicas
- Todo el dinero se maneja en centavos enteros.
- El inventario se descuenta en una segunda pasada, después de validar todos los items.
- El checkout usa el estado de React Router para recibir la selección.
- La confirmación se obtiene desde la API usando el id de la orden.

## Qué no me alcanzó
- Extras: reserva de 15 minutos y código SAVE10.
- Tests automatizados del frontend o E2E.
- Persistencia del checkout al recargar.
- Idempotencia en la creación de órdenes.

## Qué haría distinto con más tiempo
- Agregar tests de integración del flujo completo.
- Persistir la selección del checkout o la orden pendiente.
- Implementar idempotencia para evitar órdenes duplicadas por reintentos.
- Compartir tipos y contratos entre API y web.
- Mejorar accesibilidad y estados de carga.
- Implementar SAVE10 o reserva temporal si se prioriza.

## Dependencias agregadas
Ninguna.

## Cómo probar
- `pnpm install`
- `pnpm test` → 13/13
- `pnpm dev`
- Abrir `http://localhost:5173`
- Flujo: listado → detalle → checkout → confirmación.