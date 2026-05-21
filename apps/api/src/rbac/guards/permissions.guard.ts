import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RbacService } from '../rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { user: AuthUser }
    >();
    const headerOrgId = request.headers['x-organization-id'];
    const paramOrgId = request.params['id'];
    const organizationId =
      (typeof headerOrgId === 'string' && headerOrgId) ||
      (typeof paramOrgId === 'string' && paramOrgId);
    if (!organizationId) {
      throw new ForbiddenException(
        'Organization context required (x-organization-id header or route param)',
      );
    }

    for (const permission of required) {
      const allowed = await this.rbac.userHasPermission(
        request.user.id,
        organizationId,
        permission,
      );
      if (!allowed) {
        throw new ForbiddenException(
          `Missing permission: ${permission}`,
        );
      }
    }

    return true;
  }
}
