'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { usePermissions } from '@/hooks/use-permissions';
import {
  archiveCourse,
  createLesson,
  deleteCourse,
  deleteLesson,
  fetchCourse,
  fetchLessons,
  publishCourse,
  updateCourse,
  updateLesson,
  uploadLessonVideo,
} from '@/services/courses.service';
import { LessonQuizLink } from './lesson-quiz-link';

export function CourseDetail({ courseId }: { courseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ctx = useAuthCtx();
  const { has } = usePermissions();

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonContent, setEditLessonContent] = useState('');

  const orgId = ctx?.orgId;
  const canUpdate = has('course:update');
  const canPublish = has('course:publish');

  const { data: course } = useQuery({
    queryKey: ['course', orgId, courseId],
    queryFn: () => fetchCourse(ctx!, courseId),
    enabled: !!ctx,
  });

  const { data: lessons } = useQuery({
    queryKey: ['lessons', orgId, courseId],
    queryFn: () => fetchLessons(ctx!, courseId),
    enabled: !!ctx,
    refetchInterval: uploadingLessonId ? 3000 : false,
  });

  const invalidateCourse = () => {
    void queryClient.invalidateQueries({ queryKey: ['course', orgId, courseId] });
    void queryClient.invalidateQueries({ queryKey: ['lessons', orgId, courseId] });
    void queryClient.invalidateQueries({ queryKey: ['courses', orgId] });
  };

  const publishMutation = useMutation({
    mutationFn: () => publishCourse(ctx!, courseId),
    onSuccess: invalidateCourse,
  });

  const updateCourseMutation = useMutation({
    mutationFn: () =>
      updateCourse(ctx!, courseId, {
        title: editTitle,
        description: editDescription || undefined,
      }),
    onSuccess: () => {
      setEditingCourse(false);
      invalidateCourse();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveCourse(ctx!, courseId),
    onSuccess: () => router.push('/dashboard/courses'),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => deleteCourse(ctx!, courseId),
    onSuccess: () => router.push('/dashboard/courses'),
  });

  const createLessonMutation = useMutation({
    mutationFn: () =>
      createLesson(ctx!, courseId, {
        title: lessonTitle,
        content: lessonContent || undefined,
      }),
    onSuccess: () => {
      setLessonTitle('');
      setLessonContent('');
      invalidateCourse();
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      updateLesson(ctx!, courseId, lessonId, {
        title: editLessonTitle,
        content: editLessonContent || undefined,
      }),
    onSuccess: () => {
      setEditingLessonId(null);
      invalidateCourse();
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(ctx!, courseId, lessonId),
    onSuccess: invalidateCourse,
  });

  const handleVideoUpload = async (lessonId: string, file: File) => {
    setUploadingLessonId(lessonId);
    try {
      await uploadLessonVideo(ctx!, file, lessonId);
      invalidateCourse();
    } finally {
      setTimeout(() => setUploadingLessonId(null), 5000);
    }
  };

  if (!ctx) {
    return (
      <p className="text-sm text-zinc-500">
        Select a workspace from the header to view this course.
      </p>
    );
  }

  if (!course) return <p className="text-sm text-zinc-500">Loading…</p>;

  const startEditCourse = () => {
    setEditTitle(course.title);
    setEditDescription(course.description ?? '');
    setEditingCourse(true);
  };

  const startEditLesson = (lesson: { id: string; title: string; content: string | null }) => {
    setEditingLessonId(lesson.id);
    setEditLessonTitle(lesson.title);
    setEditLessonContent(lesson.content ?? '');
  };

  return (
    <div>
      <Link
        href="/dashboard/courses"
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to courses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingCourse ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                updateCourseMutation.mutate();
              }}
            >
              <input
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-lg font-semibold dark:border-zinc-700 dark:bg-zinc-900"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <textarea
                rows={3}
                placeholder="Description"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={updateCourseMutation.isPending}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCourse(false)}
                  className="text-sm text-zinc-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{course.title}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {course.status} · {course.lessonCount} lessons
              </p>
              {course.description && (
                <p className="mt-3 text-zinc-600">{course.description}</p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/courses/${courseId}/classroom`}
            className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Live classroom
          </Link>
          {canUpdate && !editingCourse && (
            <button
              type="button"
              onClick={startEditCourse}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700"
            >
              Edit course
            </button>
          )}
          {canPublish && course.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending || course.lessonCount === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {publishMutation.isPending ? 'Publishing…' : 'Publish course'}
            </button>
          )}
          {canUpdate && course.status !== 'ARCHIVED' && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Archive this course?')) archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Archive
            </button>
          )}
          {canUpdate && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Permanently delete this course?')) {
                  deleteCourseMutation.mutate();
                }
              }}
              disabled={deleteCourseMutation.isPending}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Lessons</h2>
        <ul className="mt-4 space-y-3">
          {lessons?.map((lesson, i) => (
            <li
              key={lesson.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {editingLessonId === lesson.id ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateLessonMutation.mutate(lesson.id);
                  }}
                >
                  <input
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    value={editLessonTitle}
                    onChange={(e) => setEditLessonTitle(e.target.value)}
                  />
                  <textarea
                    rows={4}
                    placeholder="Lesson content (used for AI quiz generation)"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    value={editLessonContent}
                    onChange={(e) => setEditLessonContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updateLessonMutation.isPending}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Save lesson
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLessonId(null)}
                      className="text-sm text-zinc-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {i + 1}. {lesson.title}
                      </p>
                      {lesson.content && (
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                          {lesson.content}
                        </p>
                      )}
                      {lesson.video && (
                        <p className="mt-2 text-xs text-zinc-500">
                          Video: {lesson.video.status}
                          {lesson.video.status === 'READY' && lesson.video.durationSecs
                            ? ` · ${lesson.video.durationSecs}s`
                            : ''}
                        </p>
                      )}
                      {lesson.video?.status === 'READY' && lesson.video.hlsPath && (
                        <video
                          className="mt-3 max-h-48 rounded-lg bg-black"
                          controls
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}${lesson.video.hlsPath}`}
                        />
                      )}
                    </div>
                    {canUpdate && (
                      <div className="flex shrink-0 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startEditLesson(lesson)}
                          className="text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this lesson?')) {
                              deleteLessonMutation.mutate(lesson.id);
                            }
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                    {canUpdate && (
                      <label className="cursor-pointer text-indigo-600 hover:underline">
                        {uploadingLessonId === lesson.id ? 'Processing…' : 'Upload video'}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleVideoUpload(lesson.id, file);
                          }}
                        />
                      </label>
                    )}
                    <LessonQuizLink
                      courseId={courseId}
                      lessonId={lesson.id}
                      hasContent={!!lesson.content?.trim()}
                      canManage={canUpdate}
                    />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {canUpdate && (
          <form
            className="mt-6 max-w-lg space-y-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
            onSubmit={(e) => {
              e.preventDefault();
              createLessonMutation.mutate();
            }}
          >
            <p className="text-sm font-medium">Add lesson</p>
            <input
              required
              placeholder="Lesson title"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
            />
            <textarea
              placeholder="Lesson content (required for AI quiz generation)"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
            />
            <button
              type="submit"
              disabled={createLessonMutation.isPending}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Add lesson
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
