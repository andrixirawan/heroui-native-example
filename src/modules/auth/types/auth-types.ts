export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | null;
};

export type AuthSession = {
  id: number | string;
  userId: number | string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  clientType?: string | null;
  impersonatedBy?: string | null;
};

export type SessionEnvelope = {
  user: AuthUser;
  session: AuthSession;
  needsRefresh?: boolean;
};

export type EmailSignInInput = {
  email: string;
  password: string;
};

export type EmailSignUpInput = {
  name: string;
  email: string;
  password: string;
};

export type AuthMutationResult = {
  token: string | null;
  session: SessionEnvelope;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous";
