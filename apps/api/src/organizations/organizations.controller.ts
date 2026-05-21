import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.organizationsService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.organizationsService.findOne(user.id, id);
  }

  @ApiHeader({ name: 'x-organization-id', required: true })
  @UseGuards(PermissionsGuard)
  @RequirePermissions('member:invite')
  @Post(':id/members')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(user.id, id, dto);
  }

  @Get(':id/members')
  listMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.organizationsService.listMembers(user.id, id);
  }
}
