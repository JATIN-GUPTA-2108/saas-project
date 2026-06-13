export type AnalyticsEventPayload = {
  organizationId: string;
  userId?: string;
  eventType: string;
  courseId?: string;
  lessonId?: string;
  metadata?: Record<string, unknown>;
};

export const ANALYTICS_EVENTS = {
  LESSON_COMPLETED: 'lesson.completed',
  QUIZ_ATTEMPTED: 'quiz.attempted',
  COURSE_PUBLISHED: 'course.published',
  COURSE_CREATED: 'course.created',
  USER_LOGIN: 'user.login',
  CLASSROOM_MESSAGE: 'classroom.message',
} as const;
