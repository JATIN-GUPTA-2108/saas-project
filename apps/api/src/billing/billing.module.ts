import { Module, forwardRef } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [forwardRef(() => OrganizationsModule)],
  controllers: [BillingController],
  providers: [BillingService, OrganizationGuard],
  exports: [BillingService],
})
export class BillingModule {}