export type QuizStatus = 'GENERATING' | 'READY' | 'FAILED';

export type QuizQuestion = {
  id: string;
  sortOrder: number;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string | null;
};

export type Quiz = {
  id: string;
  lessonId: string;
  title: string;
  status: QuizStatus;
  errorMessage: string | null;
  questionCount: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type QuizAttemptResult = {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  results: Array<{
    questionId: string;
    question: string;
    selectedIndex: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string | null;
  }>;
  completedAt: string;
};

export type ChatMessage = {
  courseId: string;
  organizationId: string;
  userId: string;
  email: string;
  message: string;
  sentAt: string;
};
