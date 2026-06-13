import { Global, Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [OrganizationsModule],
  controllers: [AuditController],
  providers: [AuditService, OrganizationGuard],
  exports: [AuditService],
})
export class AuditModule {}
