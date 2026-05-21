import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacService } from './rbac.service';

@ApiTags('rbac')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @ApiHeader({ name: 'x-organization-id', required: true })
  @Get('permissions')
  myPermissions(
    @CurrentUser() user: AuthUser,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.rbac.getUserPermissions(user.id, organizationId);
  }
}
