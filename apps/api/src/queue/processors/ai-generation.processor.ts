import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiService } from '../../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUES } from '../queue.constants';

export type AiGenerationJob = {
  quizId: string;
  lessonId: string;
  organizationId: string;
  questionCount: number;
};

@Processor(QUEUES.AI_GENERATION)
export class AiGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {
    super();
  }

  async process(job: Job<AiGenerationJob>) {
    const { quizId, lessonId, organizationId, questionCount } = job.data;
    this.logger.log(`Generating quiz ${quizId} (attempt ${job.attemptsMade + 1})`);

    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, organizationId },
    });
    if (!lesson) {
      await this.failQuiz(quizId, 'Lesson not found');
      return;
    }

    try {
      const generated = await this.ai.generateQuizQuestions(
        lesson.title,
        lesson.content ?? lesson.title,
        questionCount,
      );

      await this.prisma.quizQuestion.deleteMany({ where: { quizId } });
      await this.prisma.quizQuestion.createMany({
        data: generated.map((q, i) => ({
          quizId,
          sortOrder: i,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      });

      await this.prisma.quiz.update({
        where: { id: quizId },
        data: {
          status: 'READY',
          questionCount: generated.length,
          errorMessage: null,
        },
      });

      this.logger.log(`Quiz ${quizId} ready with ${generated.length} questions`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      await this.failQuiz(quizId, message);
      throw error;
    }
  }

  private async failQuiz(quizId: string, message: string) {
    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { status: 'FAILED', errorMessage: message },
    });
  }
}
