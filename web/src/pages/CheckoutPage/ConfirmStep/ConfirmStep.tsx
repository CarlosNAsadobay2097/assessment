import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  confirmOrder,
  useApiMutation,
  type ConfirmOrderBody,
} from '~/api';
import { formatUsd } from '~/lib/money';
import type { Order } from '~/types';

type ConfirmStepProps = {
  order: Order;
  name: string;
  email: string;
};
/**
 * Confirms the order created by `CheckoutPage` and redirects to `/orders/:id`.
 * It runs once on mount, guarded by `startedRef` so React StrictMode does not
 * send two requests. If the confirmation fails, it shows the API error and a
 * retry button that re-sends only the confirmation, since the order already
 * exists. This is correct: inventory and totals are computed by the backend at
 * creation, and retrying is safe because only `pending` orders can be confirmed.
 */
export function ConfirmStep({ order, name, email }: ConfirmStepProps) {
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = useApiMutation<
    Order,
    { id: string },
    ConfirmOrderBody
  >(confirmOrder, { id: order.id });

  const runConfirmation = async () => {
    setError(null);

    try {
      await confirm.mutateAsync({ name, email });
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo confirmar la orden',
      );
    }
  };

  useEffect(() => {
    if (startedRef.current) return;

    startedRef.current = true;
    void runConfirmation();
    // Se ejecuta una sola vez al montar este paso.
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Confirmando tu compra
      </h1>
      <p className="mt-3 text-ink/70">Orden {order.id}</p>

      <dl className="mt-6 rounded-2xl bg-white p-5 text-sm ring-1 ring-black/5">
        <div className="flex justify-between">
          <dt>Total</dt>
          <dd className="font-semibold">{formatUsd(order.totalCents)}</dd>
        </div>
      </dl>

      {error ? (
        <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">
            La orden fue creada, pero no se pudo confirmar.
          </p>
          <p className="mt-1">{error}</p>

          <button
            type="button"
            onClick={() => void runConfirmation()}
            disabled={confirm.isPending}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {confirm.isPending ? 'Reintentando…' : 'Reintentar confirmación'}
          </button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink/60">
          Estamos confirmando tu orden. Esto puede tardar un momento…
        </p>
      )}
    </main>
  );
}