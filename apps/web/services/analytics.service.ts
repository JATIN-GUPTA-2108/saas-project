import { apiRequest } from '@/lib/api';
import type {
  AnalyticsEvent,
  AnalyticsOverview,
  AuditLogEntry,
  BillingPlan,
  Subscription,
} from '@/types/analytics';

type AuthCtx = { token: string; organizationId: string };

type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export async function fetchAnalyticsOverview(ctx: AuthCtx) {
  return apiRequest<AnalyticsOverview>('/analytics/overview', ctx);
}

export async function fetchAnalyticsEvents(ctx: AuthCtx, page = 1) {
  return apiRequest<Paginated<AnalyticsEvent>>(
    `/analytics/events?page=${page}&limit=20`,
    ctx,
  );
}

export async function fetchAuditLogs(ctx: AuthCtx, page = 1) {
  return apiRequest<Paginated<AuditLogEntry>>(
    `/audit/logs?page=${page}&limit=20`,
    ctx,
  );
}

export async function fetchBillingPlans(ctx: AuthCtx) {
  return apiRequest<BillingPlan[]>('/billing/plans', ctx);
}

export async function fetchSubscription(ctx: AuthCtx) {
  return apiRequest<Subscription>('/billing/subscription', ctx);
}

export async function changePlan(ctx: AuthCtx, plan: string) {
  return apiRequest<Subscription>('/billing/subscription/change-plan', {
    ...ctx,
    method: 'POST',
    body: { plan },
  });
}
