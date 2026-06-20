import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private getBillingPlans() {
    return [
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
        features: [
          '25 team members',
          'Unlimited courses',
          'AI quizzes',
          'Analytics',
        ],
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
  }

  listPlans() {
    return this.getBillingPlans().map((p) => ({
      tier: p.tier,
      name: p.name,
      priceMonthly: p.priceMonthly,
      seats: p.seats,
      features: p.features,
    }));
  }

  async getSubscription(organizationId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!sub) {
      sub = await this.createDefaultSubscription(organizationId);
    }

    const plan = this.getBillingPlans().find((p) => p.tier === sub.plan);
    const memberCount = await this.prisma.organizationMembership.count({
      where: { organizationId },
    });

    return {
      plan: sub.plan,
      planName: plan?.name ?? sub.plan,
      status: sub.status,
      seats: sub.seats,
      seatsUsed: memberCount,
      currentPeriodEnd: sub.currentPeriodEnd,
      features: plan?.features ?? [],
      stripeConnected: !!sub.stripeSubscriptionId,
    };
  }

  async createDefaultSubscription(organizationId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return this.prisma.subscription.create({
      data: {
        organizationId,
        plan: PlanTier.FREE,
        status: 'ACTIVE',
        seats: 5,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  async changePlan(organizationId: string, userId: string, dto: ChangePlanDto) {
    const planDef = this.getBillingPlans().find((p) => p.tier === dto.plan);
    if (!planDef) throw new BadRequestException('Invalid plan');

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: dto.plan,
        status: 'ACTIVE',
        seats: planDef.seats,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: dto.plan,
        seats: planDef.seats,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'billing.plan_changed',
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: { plan: dto.plan },
    });

    return this.getSubscription(organizationId);
  }
}
