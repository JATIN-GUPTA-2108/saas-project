import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ANALYTICS_EVENTS } from '../analytics/analytics.constants';
import { AnalyticsTrackerService } from '../analytics/analytics.service';
import { QUEUES } from '../queue/queue.constants';
import { AiGenerationJob } from '../queue/processors/ai-generation.processor';
import { RbacService } from '../rbac/rbac.service';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly analytics: AnalyticsTrackerService,
    @InjectQueue(QUEUES.AI_GENERATION) private readonly aiQueue: Queue,
  ) {}

  async generate(organizationId: string, dto: GenerateQuizDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, organizationId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (!lesson.content?.trim()) {
      throw new BadRequestException('Lesson needs content before generating a quiz');
    }

    const questionCount = dto.questionCount ?? 5;
    const existing = await this.prisma.quiz.findUnique({
      where: { lessonId: dto.lessonId },
    });

    let quizId: string;
    if (existing) {
      await this.prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
      await this.prisma.quiz.update({
        where: { id: existing.id },
        data: {
          status: 'GENERATING',
          errorMessage: null,
          questionCount: 0,
          title: `${lesson.title} Quiz`,
        },
      });
      quizId = existing.id;
    } else {
      const quiz = await this.prisma.quiz.create({
        data: {
          organizationId,
          lessonId: dto.lessonId,
          title: `${lesson.title} Quiz`,
          status: 'GENERATING',
        },
      });
      quizId = quiz.id;
    }

    await this.aiQueue.add(
      'generate',
      {
        quizId,
        lessonId: dto.lessonId,
        organizationId,
        questionCount,
      } satisfies AiGenerationJob,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return this.findOne(organizationId, quizId, false);
  }

  async findByLesson(organizationId: string, lessonId: string, includeAnswers: boolean) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, organizationId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.formatQuiz(quiz, includeAnswers);
  }

  async findOne(organizationId: string, quizId: string, includeAnswers: boolean) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, organizationId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.formatQuiz(quiz, includeAnswers);
  }

  async submitAttempt(
    organizationId: string,
    userId: string,
    quizId: string,
    dto: SubmitAttemptDto,
  ) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId, organizationId, status: 'READY' },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found or not ready');

    let score = 0;
    const results = quiz.questions.map((q) => {
      const selected = dto.answers[q.id];
      const correct = selected === q.correctIndex;
      if (correct) score += 1;
      return {
        questionId: q.id,
        question: q.question,
        selectedIndex: selected ?? null,
        correctIndex: q.correctIndex,
        correct,
        explanation: q.explanation,
      };
    });

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        organizationId,
        quizId,
        userId,
        answers: dto.answers,
        score,
        maxScore: quiz.questions.length,
      },
    });

    await this.analytics.track({
      organizationId,
      userId,
      eventType: ANALYTICS_EVENTS.QUIZ_ATTEMPTED,
      lessonId: quiz.lessonId,
      metadata: { quizId, score, maxScore: attempt.maxScore },
    });

    return {
      attemptId: attempt.id,
      score,
      maxScore: attempt.maxScore,
      percentage: Math.round((score / attempt.maxScore) * 100),
      results,
      completedAt: attempt.completedAt,
    };
  }

  async myAttempt(organizationId: string, userId: string, quizId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { quizId, userId, organizationId },
      orderBy: { completedAt: 'desc' },
    });
    if (!attempt) throw new NotFoundException('No attempt found');
    return {
      id: attempt.id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: Math.round((attempt.score / attempt.maxScore) * 100),
      completedAt: attempt.completedAt,
    };
  }

  async canViewAnswers(userId: string, organizationId: string) {
    return this.rbac.userHasPermission(userId, organizationId, 'course:update');
  }

  private formatQuiz(
    quiz: {
      id: string;
      lessonId: string;
      title: string;
      status: string;
      errorMessage: string | null;
      questionCount: number;
      createdAt: Date;
      updatedAt: Date;
      questions: Array<{
        id: string;
        sortOrder: number;
        question: string;
        options: unknown;
        correctIndex: number;
        explanation: string | null;
      }>;
    },
    includeAnswers: boolean,
  ) {
    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      status: quiz.status,
      errorMessage: quiz.errorMessage,
      questionCount: quiz.questionCount,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        question: q.question,
        options: q.options as string[],
        ...(includeAnswers
          ? { correctIndex: q.correctIndex, explanation: q.explanation }
          : {}),
      })),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }
}
