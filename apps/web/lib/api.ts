const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta: Record<string, unknown>;
  error?: { message: string; details?: unknown };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  organizationId?: string | null;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.organizationId) {
    headers['x-organization-id'] = options.organizationId;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.message ?? 'Request failed',
      res.status,
      json.error?.details,
    );
  }

  return json.data;
}
