import { CourseDetail } from '@/features/courses/course-detail';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseDetail courseId={id} />;
}
