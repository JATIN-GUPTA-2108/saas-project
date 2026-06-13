import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrgRequest } from '../guards/organization.guard';

export const OrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<OrgRequest>();
    return request.organizationId;
  },
);
