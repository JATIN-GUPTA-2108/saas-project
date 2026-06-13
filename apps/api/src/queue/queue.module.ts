import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { AiGenerationProcessor } from './processors/ai-generation.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { VideoProcessingProcessor } from './processors/video-processing.processor';
import { QUEUES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.VIDEO_PROCESSING },
      { name: QUEUES.AI_GENERATION },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.ANALYTICS },
      { name: QUEUES.EMAILS },
    ),
    AiModule,
  ],
  providers: [
    VideoProcessingProcessor,
    AiGenerationProcessor,
    NotificationsProcessor,
    AnalyticsProcessor,
  ],
  exports: [BullModule],
})
export class QueueModule {}
