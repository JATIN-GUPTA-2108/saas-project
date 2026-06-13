import { CreateCourseForm } from '@/features/courses/create-course-form';

export default function NewCoursePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New course</h1>
      <CreateCourseForm />
    </div>
  );
}
