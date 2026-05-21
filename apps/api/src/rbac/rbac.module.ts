import { Global, Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { PermissionsGuard } from './guards/permissions.guard';
import { RbacService } from './rbac.service';

@Global()
@Module({
  controllers: [RbacController],
  providers: [RbacService, PermissionsGuard],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}
