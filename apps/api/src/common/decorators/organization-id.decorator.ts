import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const header = request.headers['x-organization-id'];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }
    const query = request.query['organizationId'];
    if (typeof query === 'string' && query.length > 0) {
      return query;
    }
    return '';
  },
);
