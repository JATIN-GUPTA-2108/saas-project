import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../queue.constants';

export type VideoProcessingJob = {
  videoId: string;
  organizationId: string;
};

@Processor(QUEUES.VIDEO_PROCESSING)
export class VideoProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessingProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<VideoProcessingJob>) {
    const { videoId, organizationId } = job.data;
    this.logger.log(`Processing video ${videoId} (attempt ${job.attemptsMade + 1})`);

    const video = await this.prisma.videoAsset.findFirst({
      where: { id: videoId, organizationId },
    });
    if (!video) {
      this.logger.warn(`Video ${videoId} not found`);
      return;
    }

    await this.prisma.videoAsset.update({
      where: { id: videoId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      // Dev stub: real deployment should run ffmpeg HLS + thumbnail generation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const basePath = `/uploads/processed/${organizationId}/${videoId}`;
      await this.prisma.videoAsset.update({
        where: { id: videoId },
        data: {
          status: 'READY',
          hlsPath: `${basePath}/playlist.m3u8`,
          thumbnailPath: `${basePath}/thumb.jpg`,
          durationSecs: 120,
        },
      });

      this.logger.log(`Video ${videoId} ready`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Processing failed';
      await this.prisma.videoAsset.update({
        where: { id: videoId },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw error;
    }
  }
}
