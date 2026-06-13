import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from '../queue/queue.constants';
import { AnalyticsEventPayload } from './analytics.constants';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsTrackerService {
  constructor(
    @InjectQueue(QUEUES.ANALYTICS) private readonly queue: Queue,
  ) {}

  async track(payload: AnalyticsEventPayload) {
    await this.queue.add('track', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
    });
  }
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [
      totalCourses,
      publishedCourses,
      totalLessons,
      quizAttempts,
      lessonCompletions,
      recentEvents,
      eventsByType,
      activeLearners,
    ] = await Promise.all([
      this.prisma.course.count({ where: { organizationId } }),
      this.prisma.course.count({
        where: { organizationId, status: 'PUBLISHED' },
      }),
      this.prisma.lesson.count({ where: { organizationId } }),
      this.prisma.quizAttempt.count({ where: { organizationId } }),
      this.prisma.lessonProgress.count({
        where: { organizationId, completed: true },
      }),
      this.prisma.analyticsEvent.count({
        where: { organizationId, createdAt: { gte: since } },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: { organizationId, createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.analyticsEvent.findMany({
        where: { organizationId, createdAt: { gte: since }, userId: { not: null } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    return {
      period: '30d',
      totals: {
        courses: totalCourses,
        publishedCourses,
        lessons: totalLessons,
        quizAttempts,
        lessonCompletions,
        events: recentEvents,
        activeLearners: activeLearners.length,
      },
      eventsByType: eventsByType.map((e) => ({
        eventType: e.eventType,
        count: e._count.id,
      })),
    };
  }

  async listEvents(organizationId: string, query: AnalyticsQueryDto) {
    const where = {
      organizationId,
      ...(query.eventType ? { eventType: query.eventType } : {}),
    };
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        userId: e.userId,
        courseId: e.courseId,
        lessonId: e.lessonId,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
