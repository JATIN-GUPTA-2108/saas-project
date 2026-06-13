import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { OrgId } from '../common/decorators/org-id.decorator';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true })
@UseGuards(JwtAuthGuard, OrganizationGuard, PermissionsGuard)
@RequirePermissions('analytics:view')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@OrgId() orgId: string) {
    return this.analytics.getOverview(orgId);
  }

  @Get('events')
  events(@OrgId() orgId: string, @Query() query: AnalyticsQueryDto) {
    return this.analytics.listEvents(orgId, query);
  }
}
