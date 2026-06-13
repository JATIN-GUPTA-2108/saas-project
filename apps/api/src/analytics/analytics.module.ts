import { Global, Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { QueueModule } from '../queue/queue.module';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService, AnalyticsTrackerService } from './analytics.service';

@Global()
@Module({
  imports: [QueueModule, OrganizationsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsTrackerService, OrganizationGuard],
  exports: [AnalyticsTrackerService],
})
export class AnalyticsModule {}
