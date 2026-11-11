import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { object, string } from 'yup';
import {
  createOrder,
  useApiMutation,
  type CreateOrderBody,
} from '~/api';
import { feeFromSubtotal, formatUsd } from '~/lib/money';
import type { CheckoutState, Order } from '~/types';
import { ConfirmStep } from './ConfirmStep';

/**
 * Receives the selected tickets through `location.state`
 * (`CheckoutState`), validates name and email with react-hook-form + Yup, shows
 * the summary with the same 10% fee as the event page (`feeFromSubtotal`) and,
 * on submit, creates the order with `useApiMutation(createOrder)` sending only
 * `ticketTypeId` and `quantity` (the API rejects extra fields). If creation
 * fails, the API message is shown inline and the button stays disabled while
 * submitting; if it succeeds, the page renders `ConfirmStep`, which confirms the
 * order and redirects to `/orders/:id`. This is correct: the order is created
 * only in the submit handler (never in an effect), so a double click cannot
 * create two orders, and confirmation is delegated to `ConfirmStep` to avoid
 * duplicating that request. Known limitation: refreshing the page loses
 * `location.state` and redirects to the event list.
 */

const schema = object({
  name: string().trim().required('El nombre es obligatorio'),
  email: string()
    .trim()
    .email('El correo no es válido')
    .required('El correo es obligatorio'),
});

type FormValues = {
  name: string;
  email: string;
};

type CheckoutResult = {
  order: Order;
  buyer: FormValues;
};

export function CheckoutPage() {
  const location = useLocation();
  const selection = location.state as CheckoutState | null;

  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { name: '', email: '' },
  });

  const create = useApiMutation<
    Order,
    Record<string, never>,
    CreateOrderBody
  >(createOrder);

  // La guardia va después de los hooks para no romper las reglas de React.
  if (!selection?.items.length) {
    return <Navigate to="/" replace />;
  }

  const subtotalCents = selection.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const feeCents = feeFromSubtotal(subtotalCents);
  const totalCents = subtotalCents + feeCents;

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    try {
      const order = await create.mutateAsync({
        eventId: selection.eventId,
        items: selection.items.map(({ ticketTypeId, quantity }) => ({
          ticketTypeId,
          quantity,
        })),
      });

      setCheckout({ order, buyer: values });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la orden',
      );
    }
  };

  // Cuando la orden ya existe, pasamos al paso de confirmación.
  if (checkout) {
    return (
      <ConfirmStep
        order={checkout.order}
        name={checkout.buyer.name}
        email={checkout.buyer.email}
      />
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_280px]">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold tracking-tight">Tus datos</h1>
        <p className="mt-2 text-sm text-ink/70">
          Completa el checkout para <strong>{selection.eventTitle}</strong>.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('name')}
              className="mt-1 w-full rounded-xl border border-black/10 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 w-full rounded-xl border border-black/10 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          {submitError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || create.isPending}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isSubmitting || create.isPending ? 'Procesando…' : 'Pagar'}
          </button>
        </form>
      </section>

      <aside className="h-max rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">Resumen</h2>

        <ul className="mt-3 space-y-2 text-sm">
          {selection.items.map((item) => (
            <li
              key={item.ticketTypeId}
              className="flex justify-between gap-3"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                {formatUsd(item.unitPriceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-black/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatUsd(subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Cargo por servicio</dt>
            <dd>{formatUsd(feeCents)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatUsd(totalCents)}</dd>
          </div>
        </dl>
      </aside>
    </main>
  );
}
