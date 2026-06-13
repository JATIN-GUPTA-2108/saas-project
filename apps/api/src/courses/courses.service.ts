import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, Prisma } from '@prisma/client';
import { ANALYTICS_EVENTS } from '../analytics/analytics.constants';
import { AnalyticsTrackerService } from '../analytics/analytics.service';
import { AuditService } from '../audit/audit.service';
import { generateSlug } from '../common/utils/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsTrackerService,
    private readonly audit: AuditService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateCourseDto) {
    const slug = generateSlug(dto.title);
    const course = await this.prisma.course.create({
      data: {
        organizationId,
        title: dto.title,
        slug,
        description: dto.description,
        tags: dto.tags ?? [],
      },
      include: { _count: { select: { lessons: true } } },
    });

    await this.analytics.track({
      organizationId,
      userId,
      eventType: ANALYTICS_EVENTS.COURSE_CREATED,
      courseId: course.id,
      metadata: { title: course.title },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'course.created',
      resourceType: 'course',
      resourceId: course.id,
      metadata: { title: course.title },
    });

    return this.formatCourse(course);
  }

  async findAll(organizationId: string, query: CourseQueryDto) {
    const where: Prisma.CourseWhereInput = { organizationId };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { lessons: true } } },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: items.map((c) => this.formatCourse(c)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(organizationId: string, courseId: string) {
    const course = await this.getCourseOrThrow(organizationId, courseId);
    return this.formatCourse(course);
  }

  async update(organizationId: string, courseId: string, dto: UpdateCourseDto) {
    await this.getCourseOrThrow(organizationId, courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags,
      },
      include: { _count: { select: { lessons: true } } },
    });
    return this.formatCourse(course);
  }

  async publish(organizationId: string, userId: string, courseId: string) {
    const course = await this.getCourseOrThrow(organizationId, courseId);
    const lessonCount = await this.prisma.lesson.count({
      where: { courseId, organizationId },
    });
    if (lessonCount === 0) {
      throw new BadRequestException('Course must have at least one lesson to publish');
    }

    const updated = await this.prisma.course.update({
      where: { id: course.id },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
      include: { _count: { select: { lessons: true } } },
    });

    await this.analytics.track({
      organizationId,
      userId,
      eventType: ANALYTICS_EVENTS.COURSE_PUBLISHED,
      courseId: updated.id,
      metadata: { title: updated.title, lessonCount },
    });
    await this.audit.log({
      organizationId,
      userId,
      action: 'course.published',
      resourceType: 'course',
      resourceId: updated.id,
      metadata: { title: updated.title },
    });

    return this.formatCourse(updated);
  }

  async archive(organizationId: string, courseId: string) {
    await this.getCourseOrThrow(organizationId, courseId);
    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED },
      include: { _count: { select: { lessons: true } } },
    });
    return this.formatCourse(updated);
  }

  async remove(organizationId: string, courseId: string) {
    await this.getCourseOrThrow(organizationId, courseId);
    await this.prisma.course.delete({ where: { id: courseId } });
    return { deleted: true };
  }

  private async getCourseOrThrow(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
      include: { _count: { select: { lessons: true } } },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  private formatCourse(course: {
    id: string;
    organizationId: string;
    title: string;
    slug: string;
    description: string | null;
    status: CourseStatus;
    tags: string[];
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { lessons: number };
  }) {
    return {
      id: course.id,
      organizationId: course.organizationId,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      tags: course.tags,
      publishedAt: course.publishedAt,
      lessonCount: course._count?.lessons ?? 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }
}
