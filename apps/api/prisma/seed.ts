import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { slug: 'course:create', description: 'Create courses' },
  { slug: 'course:update', description: 'Update courses' },
  { slug: 'course:publish', description: 'Publish courses' },
  { slug: 'analytics:view', description: 'View analytics' },
  { slug: 'billing:manage', description: 'Manage billing' },
  { slug: 'organization:manage', description: 'Manage organization settings' },
  { slug: 'member:invite', description: 'Invite members' },
  { slug: 'member:manage', description: 'Manage members' },
];

const SYSTEM_ROLES: Record<
  string,
  { name: string; permissions: string[] }
> = {
  owner: {
    name: 'Owner',
    permissions: PERMISSIONS.map((p) => p.slug),
  },
  admin: {
    name: 'Admin',
    permissions: [
      'course:create',
      'course:update',
      'course:publish',
      'analytics:view',
      'organization:manage',
      'member:invite',
      'member:manage',
    ],
  },
  instructor: {
    name: 'Instructor',
    permissions: ['course:create', 'course:update', 'course:publish', 'analytics:view'],
  },
  student: {
    name: 'Student',
    permissions: ['analytics:view'],
  },
};

async function main() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      update: { description: perm.description },
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();

  for (const [slug, roleDef] of Object.entries(SYSTEM_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { slug, organizationId: null, isSystem: true },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          slug,
          isSystem: true,
          organizationId: null,
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { name: roleDef.name },
      });
    }

    const permissionIds = allPermissions
      .filter((p) => roleDef.permissions.includes(p.slug))
      .map((p) => p.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
