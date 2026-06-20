import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../common/utils/slug.util';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { BillingService } from '../billing/billing.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly billing: BillingService,
  ) {}

  async createForUser(userId: string, name: string) {
    const slug = generateSlug(name);
    const ownerRole = await this.rbac.getSystemRole('owner');

    const organization = await this.prisma.organization.create({
      data: {
        name,
        slug,
        memberships: {
          create: {
            userId,
            roleId: ownerRole.id,
          },
        },
      },
      include: {
        memberships: {
          include: { role: true },
        },
      },
    });

    await this.billing.createDefaultSubscription(organization.id);
    await this.audit.log({
      organizationId: organization.id,
      userId,
      action: 'organization.created',
      resourceType: 'organization',
      resourceId: organization.id,
      metadata: { name },
    });

    return this.formatOrganization(organization);
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    return this.createForUser(userId, dto.name);
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      include: {
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    return memberships.map((m) => ({
      ...this.formatOrganization(m.organization),
      role: {
        slug: m.role.slug,
        name: m.role.name,
        permissions: m.role.permissions.map((p) => p.permission.slug),
      },
    }));
  }

  async findOne(userId: string, organizationId: string) {
    await this.ensureMembership(userId, organizationId);
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.formatOrganization(org);
  }

  async inviteMember(
    actorId: string,
    organizationId: string,
    dto: InviteMemberDto,
  ) {
    await this.ensureMembership(actorId, organizationId);
    const canInvite = await this.rbac.userHasPermission(
      actorId,
      organizationId,
      'member:invite',
    );
    if (!canInvite) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('User not found. They must register first.');
    }

    const role = await this.rbac.getSystemRole(dto.roleSlug);
    const existing = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });
    if (existing) {
      throw new ConflictException('User is already a member');
    }

    const membership = await this.prisma.organizationMembership.create({
      data: {
        organizationId,
        userId: user.id,
        roleId: role.id,
      },
      include: { user: true, role: true },
    });

    await this.audit.log({
      organizationId,
      userId: actorId,
      action: 'member.invited',
      resourceType: 'membership',
      resourceId: membership.id,
      metadata: { email: dto.email, roleSlug: dto.roleSlug },
    });

    return {
      id: membership.id,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
      },
      role: { slug: membership.role.slug, name: membership.role.name },
    };
  }

  async listMembers(userId: string, organizationId: string) {
    await this.ensureMembership(userId, organizationId);
    const members = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: true, role: true },
    });

    return members.map((m) => ({
      id: m.id,
      user: {
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
      },
      role: { slug: m.role.slug, name: m.role.name },
      joinedAt: m.createdAt,
    }));
  }

  async ensureMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }
    return membership;
  }

  private formatOrganization(org: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
