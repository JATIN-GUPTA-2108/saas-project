import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  aiQuizResponseSchema,
  AiQuizQuestion,
} from './ai-quiz.schema';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI | null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('OPENAI_API_KEY');
    this.openai = key ? new OpenAI({ apiKey: key }) : null;
  }

  async generateQuizQuestions(
    lessonTitle: string,
    lessonContent: string,
    count = 5,
  ): Promise<AiQuizQuestion[]> {
    const content = this.chunkContent(lessonContent);
    const prompt = this.buildPrompt(lessonTitle, content, count);

    if (this.openai) {
      return this.generateWithOpenAI(prompt, count);
    }

    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      return this.generateWithAnthropic(prompt, anthropicKey, count);
    }

    this.logger.warn('No AI API key set — using mock quiz generator');
    return this.generateMock(lessonTitle, content, count);
  }

  private async generateWithOpenAI(prompt: string, count: number) {
    const model = this.config.get('OPENAI_MODEL', 'gpt-4o-mini');
    const completion = await this.openai!.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You generate educational multiple-choice quizzes. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    return this.parseAndValidate(raw, count);
  }

  private async generateWithAnthropic(
    prompt: string,
    apiKey: string,
    count: number,
  ) {
    const model = this.config.get('ANTHROPIC_MODEL', 'claude-3-5-haiku-latest');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status}`);
    }

    const body = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return this.parseAndValidate(jsonMatch?.[0] ?? text, count);
  }

  private parseAndValidate(raw: string, count: number): AiQuizQuestion[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('AI returned invalid JSON');
    }

    const result = aiQuizResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`AI output failed validation: ${result.error.message}`);
    }

    return result.data.questions.slice(0, count).map((q) => {
      if (q.correctIndex >= q.options.length) {
        throw new Error('AI returned invalid correctIndex');
      }
      return q;
    });
  }

  private buildPrompt(title: string, content: string, count: number) {
    return `Generate exactly ${count} multiple-choice quiz questions from this lesson.

Lesson title: ${title}

Lesson content:
${content}

Return JSON in this exact shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "optional string"
    }
  ]
}

Rules:
- Questions must test understanding of the lesson content
- Each question needs 4 options
- correctIndex is 0-based
- Do not include markdown`;
  }

  private chunkContent(content: string, maxLen = 6000) {
    const trimmed = content.trim();
    if (trimmed.length <= maxLen) return trimmed;
    return `${trimmed.slice(0, maxLen)}\n...[truncated]`;
  }

  private generateMock(
    title: string,
    content: string,
    count: number,
  ): AiQuizQuestion[] {
    const snippet = content.slice(0, 120) || title;
    return Array.from({ length: count }, (_, i) => ({
      question: `Based on "${title}", what is the key concept in section ${i + 1}?`,
      options: [
        `Core idea from: ${snippet.slice(0, 40)}...`,
        'An unrelated distractor',
        'Another incorrect option',
        'None of the above',
      ],
      correctIndex: 0,
      explanation: 'Mock question generated without an AI API key.',
    }));
  }
}
