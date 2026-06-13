import { PlanTier } from '@prisma/client';

export const BILLING_PLANS = [
  {
    tier: PlanTier.FREE,
    name: 'Free',
    priceMonthly: 0,
    seats: 5,
    features: ['5 team members', '3 courses', 'Basic analytics'],
    courseLimit: 3,
  },
  {
    tier: PlanTier.STARTER,
    name: 'Starter',
    priceMonthly: 29,
    seats: 25,
    features: ['25 team members', 'Unlimited courses', 'AI quizzes', 'Analytics'],
    courseLimit: null,
  },
  {
    tier: PlanTier.PRO,
    name: 'Pro',
    priceMonthly: 99,
    seats: 100,
    features: [
      '100 team members',
      'Unlimited courses',
      'Priority support',
      'Audit logs',
      'Advanced analytics',
    ],
    courseLimit: null,
  },
] as const;
