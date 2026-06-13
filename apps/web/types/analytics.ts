export type AnalyticsOverview = {
  period: string;
  totals: {
    courses: number;
    publishedCourses: number;
    lessons: number;
    quizAttempts: number;
    lessonCompletions: number;
    events: number;
    activeLearners: number;
  };
  eventsByType: Array<{ eventType: string; count: number }>;
};

export type AnalyticsEvent = {
  id: string;
  eventType: string;
  userId: string | null;
  courseId: string | null;
  lessonId: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
};

export type BillingPlan = {
  tier: string;
  name: string;
  priceMonthly: number;
  seats: number;
  features: string[];
};

export type Subscription = {
  plan: string;
  planName: string;
  status: string;
  seats: number;
  seatsUsed: number;
  currentPeriodEnd: string | null;
  features: string[];
  stripeConnected: boolean;
};
