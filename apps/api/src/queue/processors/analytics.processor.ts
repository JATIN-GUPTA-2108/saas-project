import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsEventPayload } from '../../analytics/analytics.constants';
import { QUEUES } from '../queue.constants';

@Processor(QUEUES.ANALYTICS)
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AnalyticsEventPayload>) {
    const data = job.data;
    await this.prisma.analyticsEvent.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        eventType: data.eventType,
        courseId: data.courseId,
        lessonId: data.lessonId,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    this.logger.debug(`Tracked ${data.eventType} for org ${data.organizationId}`);
  }
}
