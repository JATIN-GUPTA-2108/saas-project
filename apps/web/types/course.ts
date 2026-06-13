export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type Course = {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  description: string | null;
  status: CourseStatus;
  tags: string[];
  publishedAt: string | null;
  lessonCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  content: string | null;
  sortOrder: number;
  video: {
    id: string;
    status: string;
    hlsPath: string | null;
    thumbnailPath: string | null;
    durationSecs: number | null;
    originalName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedCourses = {
  items: Course[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type VideoUpload = {
  id: string;
  lessonId: string | null;
  status: string;
  storagePath: string;
  originalName: string;
};
