import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { OrgId } from '../common/decorators/org-id.decorator';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { BillingService } from './billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@ApiTags('billing')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  listPlans() {
    return this.billing.listPlans();
  }

  @Get('subscription')
  getSubscription(@OrgId() orgId: string) {
    return this.billing.getSubscription(orgId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('billing:manage')
  @Post('subscription/change-plan')
  changePlan(
    @CurrentUser() user: AuthUser,
    @OrgId() orgId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.billing.changePlan(orgId, user.id, dto);
  }
}
