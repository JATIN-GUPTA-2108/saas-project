import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemRole(slug: string) {
    const role = await this.prisma.role.findFirst({
      where: { slug, organizationId: null, isSystem: true },
    });
    if (!role) {
      throw new NotFoundException(`Role "${slug}" not found`);
    }
    return role;
  }

  async userHasPermission(
    userId: string,
    organizationId: string,
    permissionSlug: string,
  ) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return false;
    }

    return membership.role.permissions.some(
      (rp) => rp.permission.slug === permissionSlug,
    );
  }

  async getUserPermissions(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return [];
    }

    return membership.role.permissions.map((rp) => rp.permission.slug);
  }
}
