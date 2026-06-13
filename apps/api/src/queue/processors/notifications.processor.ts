import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../queue.constants';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job) {
    this.logger.debug(`Notification job ${job.name}: ${JSON.stringify(job.data)}`);
    // Phase 4: persist + email/push delivery
    return { delivered: false, stub: true };
  }
}
