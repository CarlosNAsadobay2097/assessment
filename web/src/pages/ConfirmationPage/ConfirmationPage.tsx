import { Link, useParams } from 'react-router';
import { eventById, orderById, useApiQuery } from '~/api';
import { formatEventWhen } from '~/lib/datetime';
import { formatUsd } from '~/lib/money';
import type { EventRecord, Order } from '~/types';
/**
 * It reads `orderId` from the route, loads
 * the order with `useApiQuery(orderById, { id }, { enabled })` and, once it
 * exists, loads its event with `eventById` to show title, venue and date. It
 * handles the missing-id, loading and not-found states, and displays the ticket
 * lines, buyer name and email, subtotal, fee and total using `formatUsd`
 * (`formatEventWhen` for the date). This is correct: everything comes from the
 * API by id, so the page survives a reload and works for both `pending` and
 * `confirmed` orders; the event query is optional and does not block the
 * receipt. No local state is needed because the order is the source of truth.
 */
export function ConfirmationPage() {
  const { orderId = '' } = useParams();

  const {
    data: order,
    isPending: isOrderPending,
    isError: isOrderError,
    error: orderError,
  } = useApiQuery<Order>(
    orderById,
    { id: orderId },
    { enabled: Boolean(orderId) },
  );

  // Opcional: cargar el evento para mostrar título, lugar y fecha.
  const { data: event } = useApiQuery<EventRecord>(
    eventById,
    { id: order?.eventId ?? '' },
    { enabled: Boolean(order?.eventId) },
  );

  if (!orderId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Orden no encontrada
        </h1>
        <p className="mt-3 text-ink/70">
          No recibimos un identificador de orden.
        </p>
        <Link to="/" className="mt-8 inline-block text-accent">
          Volver a eventos
        </Link>
      </main>
    );
  }

  if (isOrderPending) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-ink/60">
        Cargando orden…
      </main>
    );
  }

  if (isOrderError || !order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No encontramos esta orden
        </h1>
        <p className="mt-3 text-ink/70">
          {orderError?.message ?? 'Revisa el enlace e inténtalo de nuevo.'}
        </p>
        <Link to="/" className="mt-8 inline-block text-accent">
          Volver a eventos
        </Link>
      </main>
    );
  }

  const isConfirmed = order.status === 'confirmed';

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <p className="text-sm uppercase tracking-wide text-accent">
          {isConfirmed ? 'Compra confirmada' : 'Orden pendiente'}
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isConfirmed ? '¡Gracias por tu compra!' : 'Tu orden está pendiente'}
        </h1>

        <p className="mt-3 text-ink/70">
          {isConfirmed
            ? 'Tu pago fue confirmado y tus entradas están reservadas.'
            : 'La orden fue creada, pero todavía no se confirmó.'}
        </p>
      </div>

      <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              {event?.title ?? order.eventId}
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              {event
                ? `${event.venue} · ${formatEventWhen(event.startsAt)}`
                : `Orden ${order.id}`}
            </p>
          </div>

          <span
            className={
              isConfirmed
                ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800'
                : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800'
            }
          >
            {isConfirmed ? 'Confirmada' : 'Pendiente'}
          </span>
        </div>

        <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
          {order.items.map((item) => (
            <li
              key={item.ticketTypeId}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-ink/60">
                  {item.quantity} × {formatUsd(item.unitPriceCents)}
                </p>
              </div>
              <p className="tabular-nums">
                {formatUsd(item.lineTotalCents)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatUsd(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Cargo por servicio</dt>
            <dd>{formatUsd(order.feeCents)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatUsd(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h2 className="font-semibold">Comprador</h2>

        {order.buyer ? (
          <div className="mt-2 text-sm">
            <p className="font-medium">{order.buyer.name}</p>
            <p className="text-ink/60">{order.buyer.email}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink/60">
            Esta orden todavía no tiene datos del comprador.
          </p>
        )}

        <p className="mt-4 text-xs text-ink/50">
          Orden <code>{order.id}</code>
        </p>
      </section>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          Volver a eventos
        </Link>
      </div>
    </main>
  );
}
