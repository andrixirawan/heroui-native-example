import { Platform } from "react-native";

import type {
  AuthMutationResult,
  EmailSignInInput,
  EmailSignUpInput,
  SessionEnvelope,
} from "@/modules/auth/types/auth-types";

const AUTH_BASE_PATH = "/api/auth";
const REQUEST_TIMEOUT_MS = 8000;

function getClientType() {
  if (Platform.OS === "ios") {
    return "ios";
  }

  if (Platform.OS === "android") {
    return "android";
  }

  return "native";
}

export function getApiBaseUrl() {
  const rawValue = process.env.EXPO_PUBLIC_API_URL?.trim();
  return rawValue ? rawValue.replace(/\/+$/, "") : null;
}

function toUrlOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function getNativeOrigin() {
  const explicitOrigin = toUrlOrigin(process.env.EXPO_PUBLIC_AUTH_ORIGIN);

  if (explicitOrigin) {
    return explicitOrigin;
  }

  return toUrlOrigin(getApiBaseUrl());
}

function getAuthUrl(path: string) {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new AuthApiError(
      "Missing EXPO_PUBLIC_API_URL. Set it in your Expo environment before using auth.",
      0,
      "AUTH_CONFIG_ERROR"
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${AUTH_BASE_PATH}${normalizedPath}`;
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isSessionEnvelope(value: unknown): value is SessionEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeSession = value as Partial<SessionEnvelope>;
  return Boolean(
    maybeSession.user &&
      maybeSession.session &&
      typeof maybeSession.user === "object" &&
      typeof maybeSession.session === "object"
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AuthApiError(
        "Auth request timed out. Please try again.",
        0,
        "REQUEST_TIMEOUT"
      );
    }

    if (error instanceof AuthApiError) {
      throw error;
    }

    throw new AuthApiError(
      "Network error while talking to auth server.",
      0,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function createBaseHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set("X-Client-Type", getClientType());

  if (Platform.OS !== "web") {
    const nativeOrigin = getNativeOrigin();
    if (nativeOrigin) {
      headers.set("Origin", nativeOrigin);
    }
  }

  return headers;
}

export class AuthApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

function toAuthApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthApiError) {
    const normalizedMessage = error.message.toLowerCase();
    if (normalizedMessage.includes("missing or null origin")) {
      return new AuthApiError(
        "Backend menolak request karena header Origin tidak ada. Tambahkan origin app ke trusted origins server, lalu set EXPO_PUBLIC_AUTH_ORIGIN di app.",
        error.status,
        error.code
      );
    }

    return error;
  }

  if (error instanceof Error) {
    return new AuthApiError(error.message, 0);
  }

  return new AuthApiError(fallbackMessage, 0);
}

async function getSessionInternal(
  token: string | null,
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const headers = createBaseHeaders();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetchWithTimeout(
    getAuthUrl("/get-session"),
    {
      method: "GET",
      headers,
    },
    timeoutMs
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    const body = await readJsonSafely(response);
    throw new AuthApiError(
      body?.message ?? body?.error ?? "Failed to load session.",
      response.status,
      body?.code
    );
  }

  const body = await readJsonSafely(response);
  return isSessionEnvelope(body) ? body : null;
}

async function handleAuthMutation(
  path: "/sign-in/email" | "/sign-up/email",
  body: EmailSignInInput | EmailSignUpInput
) {
  const headers = createBaseHeaders({
    "Content-Type": "application/json",
  });

  const response = await fetchWithTimeout(getAuthUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    throw new AuthApiError(
      payload?.message ?? payload?.error ?? "Authentication failed.",
      response.status,
      payload?.code
    );
  }

  const token = response.headers.get("set-auth-token");

  if (!token) {
    throw new AuthApiError(
      "Login succeeded but the backend did not return set-auth-token.",
      response.status,
      "MISSING_AUTH_TOKEN"
    );
  }

  const session = await getSessionInternal(token);

  if (!session) {
    throw new AuthApiError(
      "Login succeeded but session could not be loaded from /get-session.",
      0,
      "MISSING_SESSION"
    );
  }

  return {
    token,
    session,
  } satisfies AuthMutationResult;
}

export const authApi = {
  async signInEmail(input: EmailSignInInput) {
    try {
      return await handleAuthMutation("/sign-in/email", {
        email: input.email.trim(),
        password: input.password,
        rememberMe: input.rememberMe ?? true,
      });
    } catch (error) {
      throw toAuthApiError(error, "Failed to sign in.");
    }
  },

  async signUpEmail(input: EmailSignUpInput) {
    try {
      return await handleAuthMutation("/sign-up/email", {
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
      });
    } catch (error) {
      throw toAuthApiError(error, "Failed to create account.");
    }
  },

  async getSession(token: string | null, timeoutMs = REQUEST_TIMEOUT_MS) {
    try {
      return await getSessionInternal(token, timeoutMs);
    } catch (error) {
      throw toAuthApiError(error, "Failed to refresh session.");
    }
  },

  async signOut(token: string | null) {
    if (!token) {
      return;
    }

    const headers = createBaseHeaders({
      "Content-Type": "application/json",
    });
    headers.set("Authorization", `Bearer ${token}`);

    try {
      const response = await fetchWithTimeout(getAuthUrl("/sign-out"), {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });

      if (!response.ok && response.status !== 401) {
        const body = await readJsonSafely(response);
        throw new AuthApiError(
          body?.message ?? body?.error ?? "Failed to sign out.",
          response.status,
          body?.code
        );
      }
    } catch (error) {
      throw toAuthApiError(error, "Failed to sign out.");
    }
  },
};
