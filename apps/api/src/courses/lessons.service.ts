import { Injectable, NotFoundException } from '@nestjs/common';
import { ANALYTICS_EVENTS } from '../analytics/analytics.constants';
import { AnalyticsTrackerService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsTrackerService,
  ) {}

  async findAll(organizationId: string, courseId: string) {
    await this.ensureCourse(organizationId, courseId);
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId, organizationId },
      orderBy: { sortOrder: 'asc' },
      include: { video: true },
    });
    return lessons.map((l) => this.formatLesson(l));
  }

  async create(organizationId: string, courseId: string, dto: CreateLessonDto) {
    await this.ensureCourse(organizationId, courseId);
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const max = await this.prisma.lesson.aggregate({
        where: { courseId },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? -1) + 1;
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        organizationId,
        courseId,
        title: dto.title,
        content: dto.content,
        sortOrder,
      },
      include: { video: true },
    });
    return this.formatLesson(lesson);
  }

  async update(
    organizationId: string,
    courseId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ) {
    await this.ensureLesson(organizationId, courseId, lessonId);
    const lesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title,
        content: dto.content,
        sortOrder: dto.sortOrder,
      },
      include: { video: true },
    });
    return this.formatLesson(lesson);
  }

  async remove(organizationId: string, courseId: string, lessonId: string) {
    await this.ensureLesson(organizationId, courseId, lessonId);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { deleted: true };
  }

  async updateProgress(
    organizationId: string,
    userId: string,
    courseId: string,
    lessonId: string,
    dto: UpdateProgressDto,
  ) {
    await this.ensureLesson(organizationId, courseId, lessonId);
    const progressPct = dto.progressPct ?? (dto.completed ? 100 : 0);
    const completed = dto.completed ?? progressPct >= 100;

    const progress = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        organizationId,
        userId,
        lessonId,
        courseId,
        progressPct,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        progressPct,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await this.analytics.track({
        organizationId,
        userId,
        eventType: ANALYTICS_EVENTS.LESSON_COMPLETED,
        courseId,
        lessonId,
        metadata: { progressPct },
      });
    }

    return {
      lessonId: progress.lessonId,
      courseId: progress.courseId,
      progressPct: progress.progressPct,
      completed: progress.completed,
      completedAt: progress.completedAt,
    };
  }

  async getCourseProgress(organizationId: string, userId: string, courseId: string) {
    await this.ensureCourse(organizationId, courseId);
    const [totalLessons, completed] = await Promise.all([
      this.prisma.lesson.count({ where: { courseId, organizationId } }),
      this.prisma.lessonProgress.count({
        where: { courseId, userId, organizationId, completed: true },
      }),
    ]);
    return {
      courseId,
      totalLessons,
      completedLessons: completed,
      completionPct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
    };
  }

  private async ensureCourse(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async ensureLesson(
    organizationId: string,
    courseId: string,
    lessonId: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, courseId, organizationId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  private formatLesson(lesson: {
    id: string;
    courseId: string;
    organizationId: string;
    title: string;
    content: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    video?: {
      id: string;
      status: string;
      hlsPath: string | null;
      thumbnailPath: string | null;
      durationSecs: number | null;
      originalName: string;
    } | null;
  }) {
    return {
      id: lesson.id,
      courseId: lesson.courseId,
      title: lesson.title,
      content: lesson.content,
      sortOrder: lesson.sortOrder,
      video: lesson.video
        ? {
            id: lesson.video.id,
            status: lesson.video.status,
            hlsPath: lesson.video.hlsPath,
            thumbnailPath: lesson.video.thumbnailPath,
            durationSecs: lesson.video.durationSecs,
            originalName: lesson.video.originalName,
          }
        : null,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  }
}
