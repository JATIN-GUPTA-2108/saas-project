'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { ClassroomView } from '@/features/classroom/classroom-view';
import { fetchCourse } from '@/services/courses.service';
import { useAuthStore } from '@/stores/auth-store';

export default function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () =>
      fetchCourse({
        token: accessToken!,
        organizationId: activeOrganization!.id,
      }, courseId),
    enabled: !!accessToken && !!activeOrganization,
  });

  return (
    <ClassroomView
      courseId={courseId}
      courseTitle={course?.title ?? 'Course'}
    />
  );
}
