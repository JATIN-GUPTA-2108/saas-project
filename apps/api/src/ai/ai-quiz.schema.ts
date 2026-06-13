import { z } from 'zod';

export const aiQuizQuestionSchema = z.object({
  question: z.string().min(10),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional(),
});

export const aiQuizResponseSchema = z.object({
  questions: z.array(aiQuizQuestionSchema).min(1).max(20),
});

export type AiQuizQuestion = z.infer<typeof aiQuizQuestionSchema>;
export type AiQuizResponse = z.infer<typeof aiQuizResponseSchema>;
