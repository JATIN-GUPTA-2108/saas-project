import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BILLING_PLANS } from './billing.constants';
import { ChangePlanDto } from './dto/change-plan.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listPlans() {
    return BILLING_PLANS.map((p) => ({
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

    const plan = BILLING_PLANS.find((p) => p.tier === sub.plan);
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

  async changePlan(
    organizationId: string,
    userId: string,
    dto: ChangePlanDto,
  ) {
    const planDef = BILLING_PLANS.find((p) => p.tier === dto.plan);
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
