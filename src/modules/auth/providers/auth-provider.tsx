import { createContext, useEffect, useState, type ReactNode } from "react";

import {
  authClient,
  getApiBaseUrl,
  getSessionStoreSnapshot,
} from "@/modules/auth/lib/auth-client";
import { AuthApiError, toAuthApiError } from "@/modules/auth/lib/auth-errors";
import type {
  AuthStatus,
  EmailSignInInput,
  EmailSignUpInput,
  SessionEnvelope,
} from "@/modules/auth/types/auth-types";

type PendingAction = "sign-in" | "sign-up" | "sign-out" | "refresh" | null;

type AuthContextValue = {
  apiBaseUrl: string | null;
  configError: string | null;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  isHydrated: boolean;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  refreshSession: (options?: {
    silent?: boolean;
  }) => Promise<SessionEnvelope | null>;
  session: SessionEnvelope | null;
  signIn: (input: EmailSignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: EmailSignUpInput) => Promise<void>;
  status: AuthStatus;
};

const missingApiUrlMessage =
  "Set EXPO_PUBLIC_API_URL first so the app knows where your Better Auth backend lives.";

export const AuthContext = createContext<AuthContextValue | null>(null);

function createConfigError(apiBaseUrl: string | null): AuthContextValue {
  return {
    apiBaseUrl,
    configError: missingApiUrlMessage,
    errorMessage: null,
    isAuthenticated: false,
    isBusy: false,
    isHydrated: true,
    lastSyncAt: null,
    lastSyncError: null,
    async refreshSession() {
      return null;
    },
    session: null,
    async signIn() {
      throw new AuthApiError(missingApiUrlMessage, 0, "AUTH_CONFIG_ERROR");
    },
    async signOut() {},
    async signUp() {
      throw new AuthApiError(missingApiUrlMessage, 0, "AUTH_CONFIG_ERROR");
    },
    status: "anonymous",
  };
}

function getSessionSnapshot() {
  const snapshot = getSessionStoreSnapshot();
  return snapshot.data ?? null;
}

function getStatus(
  isHydrated: boolean,
  session: SessionEnvelope | null,
): AuthStatus {
  if (!isHydrated) {
    return "loading";
  }

  return session ? "authenticated" : "anonymous";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return (
      <AuthContext.Provider value={createConfigError(apiBaseUrl)}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ConfiguredAuthProvider apiBaseUrl={apiBaseUrl}>
      {children}
    </ConfiguredAuthProvider>
  );
}

function ConfiguredAuthProvider({
  apiBaseUrl,
  children,
}: {
  apiBaseUrl: string;
  children: ReactNode;
}) {
  const sessionState = authClient.useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const session = (sessionState.data ?? null) as SessionEnvelope | null;
  const hasSession = Boolean(session);
  const isHydrated = Boolean(session) || !sessionState.isPending;
  const status = getStatus(isHydrated, session);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (sessionState.error) {
      setLastSyncError(
        toAuthApiError(sessionState.error, "Failed to refresh session.")
          .message,
      );
      return;
    }

    if (hasSession) {
      setLastSyncAt(Date.now());
      setLastSyncError(null);
      return;
    }

    if (pendingAction !== "sign-in" && pendingAction !== "sign-up") {
      setLastSyncAt(null);
      setLastSyncError(null);
    }
  }, [
    isHydrated,
    hasSession,
    pendingAction,
    session?.session.expiresAt,
    session?.session.id,
    sessionState.error,
  ]);

  async function syncSession(fallbackMessage: string) {
    await sessionState.refetch();

    const snapshot = getSessionStoreSnapshot();

    if (snapshot.error) {
      throw toAuthApiError(snapshot.error, fallbackMessage);
    }

    return snapshot.data ?? null;
  }

  async function refreshSession(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setErrorMessage(null);
      setPendingAction("refresh");
    }

    try {
      const nextSession = await syncSession("Failed to refresh session.");

      setLastSyncAt(nextSession ? Date.now() : null);
      setLastSyncError(null);

      return nextSession;
    } catch (error) {
      const authError = toAuthApiError(error, "Failed to refresh session.");

      setLastSyncError(authError.message);

      if (!options?.silent) {
        setErrorMessage(authError.message);
      }

      return getSessionSnapshot();
    } finally {
      if (!options?.silent) {
        setPendingAction(null);
      }
    }
  }

  async function signIn(input: EmailSignInInput) {
    setErrorMessage(null);
    setPendingAction("sign-in");

    try {
      const result = await authClient.signIn.email({
        email: input.email.trim(),
        password: input.password,
      });

      if (result.error) {
        throw toAuthApiError(result.error, "Failed to sign in.");
      }

      const nextSession = await syncSession(
        "Login succeeded but session could not be loaded from /get-session.",
      );

      if (!nextSession) {
        throw new AuthApiError(
          "Login succeeded but session could not be loaded from /get-session.",
          0,
          "MISSING_SESSION",
        );
      }

      setLastSyncAt(Date.now());
      setLastSyncError(null);
    } catch (error) {
      const authError = toAuthApiError(error, "Failed to sign in.");

      setErrorMessage(authError.message);
      throw authError;
    } finally {
      setPendingAction(null);
    }
  }

  async function signUp(input: EmailSignUpInput) {
    setErrorMessage(null);
    setPendingAction("sign-up");

    try {
      const result = await authClient.signUp.email({
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
      });

      if (result.error) {
        throw toAuthApiError(result.error, "Failed to create account.");
      }

      const nextSession = await syncSession(
        "Register succeeded but session could not be loaded from /get-session.",
      );

      if (!nextSession) {
        throw new AuthApiError(
          "Register succeeded but session could not be loaded from /get-session.",
          0,
          "MISSING_SESSION",
        );
      }

      setLastSyncAt(Date.now());
      setLastSyncError(null);
    } catch (error) {
      const authError = toAuthApiError(error, "Failed to create account.");

      setErrorMessage(authError.message);
      throw authError;
    } finally {
      setPendingAction(null);
    }
  }

  async function signOut() {
    setErrorMessage(null);
    setPendingAction("sign-out");

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw toAuthApiError(result.error, "Failed to sign out.");
      }
    } catch {
      // Local logout must still succeed even if the server-side sign-out call fails.
    } finally {
      try {
        await sessionState.refetch();
      } catch {
        // Native Expo client already clears the local cookie cache before the request runs.
      }

      setLastSyncAt(null);
      setLastSyncError(null);
      setErrorMessage(null);
      setPendingAction(null);
    }
  }

  const value: AuthContextValue = {
    apiBaseUrl,
    configError: null,
    errorMessage,
    isAuthenticated: status === "authenticated" && hasSession,
    isBusy:
      pendingAction !== null ||
      sessionState.isPending ||
      sessionState.isRefetching,
    isHydrated,
    lastSyncAt,
    lastSyncError,
    refreshSession,
    session,
    signIn,
    signOut,
    signUp,
    status,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
