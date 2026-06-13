'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePlan,
  fetchBillingPlans,
  fetchSubscription,
} from '@/services/analytics.service';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { usePermissions } from '@/hooks/use-permissions';

export function BillingPanel() {
  const queryClient = useQueryClient();
  const ctx = useAuthCtx();
  const { has } = usePermissions();
  const canManage = has('billing:manage');

  const { data: subscription } = useQuery({
    queryKey: ['subscription', ctx?.orgId],
    queryFn: () => fetchSubscription(ctx!),
    enabled: !!ctx,
  });

  const { data: plans } = useQuery({
    queryKey: ['billing-plans', ctx?.orgId],
    queryFn: () => fetchBillingPlans(ctx!),
    enabled: !!ctx,
  });

  const mutation = useMutation({
    mutationFn: (plan: string) => changePlan(ctx!, plan),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['subscription'] }),
  });

  if (!ctx) {
    return <p className="text-sm text-zinc-500">Select a workspace first.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your workspace subscription
      </p>

      {subscription && (
        <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
            Current plan
          </p>
          <p className="mt-1 text-2xl font-bold">{subscription.planName}</p>
          <p className="mt-2 text-sm text-zinc-600">
            {subscription.seatsUsed} / {subscription.seats} seats used ·{' '}
            {subscription.status}
          </p>
          {subscription.currentPeriodEnd && (
            <p className="mt-1 text-xs text-zinc-500">
              Renews{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent = subscription?.plan === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`rounded-xl border p-5 ${
                isCurrent
                  ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 dark:bg-zinc-900'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-2 text-2xl font-bold">
                ${plan.priceMonthly}
                <span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-zinc-600">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {canManage && !isCurrent && (
                <button
                  type="button"
                  onClick={() => mutation.mutate(plan.tier)}
                  disabled={mutation.isPending}
                  className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {mutation.isPending ? 'Updating…' : `Switch to ${plan.name}`}
                </button>
              )}
              {isCurrent && (
                <p className="mt-4 text-center text-xs font-medium text-indigo-600">
                  Current plan
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        Stripe integration is not wired yet — plan changes update locally for demo
        purposes.
      </p>
    </div>
  );
}
