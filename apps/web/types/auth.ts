export type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  role?: { slug: string; name: string };
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = AuthTokens & { user: User };

export type RegisterResponse = LoginResponse & { organization: Organization };
