import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../decorators/current-user.decorator';
import { OrganizationsService } from '../../organizations/organizations.service';

export type OrgRequest = Request & {
  user: AuthUser;
  organizationId: string;
};

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly organizations: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OrgRequest>();
    const orgId = request.headers['x-organization-id'];
    if (typeof orgId !== 'string' || !orgId) {
      throw new ForbiddenException('x-organization-id header is required');
    }
    await this.organizations.ensureMembership(request.user.id, orgId);
    request.organizationId = orgId;
    return true;
  }
}
