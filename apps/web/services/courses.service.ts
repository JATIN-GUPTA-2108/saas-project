import { apiRequest, apiUpload } from '@/lib/api';
import type { Course, Lesson, PaginatedCourses, VideoUpload } from '@/types/course';

type AuthCtx = { token: string; organizationId: string };

export async function fetchCourses(
  ctx: AuthCtx,
  params?: { page?: number; status?: string; search?: string },
) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  const query = qs.toString() ? `?${qs}` : '';
  return apiRequest<PaginatedCourses>(`/courses${query}`, ctx);
}

export async function fetchCourse(ctx: AuthCtx, courseId: string) {
  return apiRequest<Course>(`/courses/${courseId}`, ctx);
}

export async function createCourse(
  ctx: AuthCtx,
  body: { title: string; description?: string; tags?: string[] },
) {
  return apiRequest<Course>('/courses', { ...ctx, method: 'POST', body });
}

export async function updateCourse(
  ctx: AuthCtx,
  courseId: string,
  body: { title?: string; description?: string; tags?: string[] },
) {
  return apiRequest<Course>(`/courses/${courseId}`, {
    ...ctx,
    method: 'PATCH',
    body,
  });
}

export async function publishCourse(ctx: AuthCtx, courseId: string) {
  return apiRequest<Course>(`/courses/${courseId}/publish`, {
    ...ctx,
    method: 'POST',
  });
}

export async function deleteCourse(ctx: AuthCtx, courseId: string) {
  return apiRequest<{ deleted: boolean }>(`/courses/${courseId}`, {
    ...ctx,
    method: 'DELETE',
  });
}

export async function archiveCourse(ctx: AuthCtx, courseId: string) {
  return apiRequest<Course>(`/courses/${courseId}/archive`, {
    ...ctx,
    method: 'POST',
  });
}

export async function updateLesson(
  ctx: AuthCtx,
  courseId: string,
  lessonId: string,
  body: { title?: string; content?: string; sortOrder?: number },
) {
  return apiRequest<Lesson>(`/courses/${courseId}/lessons/${lessonId}`, {
    ...ctx,
    method: 'PATCH',
    body,
  });
}

export async function fetchLessons(ctx: AuthCtx, courseId: string) {
  return apiRequest<Lesson[]>(`/courses/${courseId}/lessons`, ctx);
}

export async function createLesson(
  ctx: AuthCtx,
  courseId: string,
  body: { title: string; content?: string },
) {
  return apiRequest<Lesson>(`/courses/${courseId}/lessons`, {
    ...ctx,
    method: 'POST',
    body,
  });
}

export async function deleteLesson(ctx: AuthCtx, courseId: string, lessonId: string) {
  return apiRequest<{ deleted: boolean }>(
    `/courses/${courseId}/lessons/${lessonId}`,
    { ...ctx, method: 'DELETE' },
  );
}

export async function uploadLessonVideo(
  ctx: AuthCtx,
  file: File,
  lessonId: string,
) {
  return apiUpload<VideoUpload>('/uploads/video', file, {
    token: ctx.token,
    organizationId: ctx.organizationId,
    query: { lessonId },
  });
}
