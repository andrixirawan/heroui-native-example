import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { authApi, AuthApiError, getApiBaseUrl } from "@/modules/auth/lib/auth-api";
import { authStorage } from "@/modules/auth/lib/auth-storage";
import type {
  AuthStatus,
  EmailSignInInput,
  EmailSignUpInput,
  SessionEnvelope,
} from "@/modules/auth/types/auth-types";

type AuthContextValue = {
  apiBaseUrl: string | null;
  configError: string | null;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isBusy: boolean;
  isHydrated: boolean;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  refreshSession: (options?: { silent?: boolean }) => Promise<SessionEnvelope | null>;
  session: SessionEnvelope | null;
  signIn: (input: EmailSignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: EmailSignUpInput) => Promise<void>;
  status: AuthStatus;
};

type AuthState = {
  configError: string | null;
  errorMessage: string | null;
  isHydrated: boolean;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  pendingAction: "bootstrap" | "sign-in" | "sign-up" | "sign-out" | "refresh" | null;
  session: SessionEnvelope | null;
  status: AuthStatus;
};

const initialState: AuthState = {
  configError: null,
  errorMessage: null,
  isHydrated: false,
  lastSyncAt: null,
  lastSyncError: null,
  pendingAction: "bootstrap",
  session: null,
  status: "loading",
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof AuthApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function applyAuthenticatedState(session: SessionEnvelope) {
  return {
    status: "authenticated" as const,
    session,
    errorMessage: null,
    lastSyncAt: Date.now(),
    lastSyncError: null,
  };
}

function applyAnonymousState() {
  return {
    status: "anonymous" as const,
    session: null,
    errorMessage: null,
    lastSyncAt: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const apiBaseUrl = getApiBaseUrl();
  const syncPromiseRef = useRef<Promise<SessionEnvelope | null> | null>(null);
  const stateRef = useRef(state);
  const refreshSessionRef = useRef<
    (options?: { silent?: boolean }) => Promise<SessionEnvelope | null>
  >(async () => null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      if (!apiBaseUrl) {
        if (!isMounted) {
          return;
        }

        setState({
          ...initialState,
          configError:
            "Set EXPO_PUBLIC_API_URL first so the app knows where your Better Auth backend lives.",
          isHydrated: true,
          pendingAction: null,
          status: "anonymous",
        });
        return;
      }

      const [token, cachedSession] = await Promise.all([
        authStorage.getToken(),
        authStorage.getSessionSnapshot(),
      ]);

      if (!isMounted) {
        return;
      }

      if (!token) {
        await authStorage.clearSessionSnapshot();

        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...current,
          ...applyAnonymousState(),
          configError: null,
          isHydrated: true,
          pendingAction: null,
          lastSyncError: null,
        }));
        return;
      }

      if (cachedSession) {
        setState((current) => ({
          ...current,
          ...applyAuthenticatedState(cachedSession),
          isHydrated: false,
          pendingAction: "bootstrap",
        }));
      }

      try {
        const session = await authApi.getSession(token);

        if (!isMounted) {
          return;
        }

        if (!session) {
          await authStorage.clearAll();

          if (!isMounted) {
            return;
          }

          setState((current) => ({
            ...current,
            ...applyAnonymousState(),
            configError: null,
            isHydrated: true,
            pendingAction: null,
          }));
          return;
        }

        await authStorage.setSessionSnapshot(session);

        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...current,
          ...applyAuthenticatedState(session),
          configError: null,
          isHydrated: true,
          pendingAction: null,
        }));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (cachedSession) {
          setState((current) => ({
            ...current,
            ...applyAuthenticatedState(cachedSession),
            configError: null,
            errorMessage: null,
            isHydrated: true,
            lastSyncError: getErrorMessage(error),
            pendingAction: null,
          }));
          return;
        }

        await authStorage.clearAll();

        if (!isMounted) {
          return;
        }

        setState((current) => ({
          ...current,
          ...applyAnonymousState(),
          configError: null,
          errorMessage: null,
          isHydrated: true,
          lastSyncError: getErrorMessage(error),
          pendingAction: null,
        }));
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function refreshSession(options?: { silent?: boolean }) {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const promise = (async () => {
      const token = await authStorage.getToken();

      if (!token) {
        await authStorage.clearSessionSnapshot();
        setState((current) => ({
          ...current,
          ...applyAnonymousState(),
          pendingAction: null,
        }));
        return null;
      }

      if (!options?.silent) {
        setState((current) => ({
          ...current,
          errorMessage: null,
          pendingAction: "refresh",
        }));
      }

      try {
        const session = await authApi.getSession(token);

        if (!session) {
          await authStorage.clearAll();
          setState((current) => ({
            ...current,
            ...applyAnonymousState(),
            lastSyncError: null,
            pendingAction: null,
          }));
          return null;
        }

        await authStorage.setSessionSnapshot(session);
        setState((current) => ({
          ...current,
          ...applyAuthenticatedState(session),
          pendingAction: null,
        }));
        return session;
      } catch (error) {
        setState((current) => ({
          ...current,
          errorMessage: options?.silent ? current.errorMessage : getErrorMessage(error),
          lastSyncError: getErrorMessage(error),
          pendingAction: null,
        }));
        return stateRef.current.session;
      }
    })();

    syncPromiseRef.current = promise;

    try {
      return await promise;
    } finally {
      syncPromiseRef.current = null;
    }
  }

  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && stateRef.current.isHydrated && stateRef.current.session) {
        void refreshSessionRef.current({ silent: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function persistAuthenticatedSession(session: SessionEnvelope, token: string) {
    await Promise.all([authStorage.setToken(token), authStorage.setSessionSnapshot(session)]);
  }

  async function signIn(input: EmailSignInInput) {
    setState((current) => ({
      ...current,
      errorMessage: null,
      pendingAction: "sign-in",
    }));

    try {
      const result = await authApi.signInEmail(input);
      await persistAuthenticatedSession(result.session, result.token);
      setState((current) => ({
        ...current,
        ...applyAuthenticatedState(result.session),
        configError: null,
        isHydrated: true,
        pendingAction: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        errorMessage: getErrorMessage(error),
        pendingAction: null,
      }));
      throw error;
    }
  }

  async function signUp(input: EmailSignUpInput) {
    setState((current) => ({
      ...current,
      errorMessage: null,
      pendingAction: "sign-up",
    }));

    try {
      const result = await authApi.signUpEmail(input);
      await persistAuthenticatedSession(result.session, result.token);
      setState((current) => ({
        ...current,
        ...applyAuthenticatedState(result.session),
        configError: null,
        isHydrated: true,
        pendingAction: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        errorMessage: getErrorMessage(error),
        pendingAction: null,
      }));
      throw error;
    }
  }

  async function signOut() {
    setState((current) => ({
      ...current,
      errorMessage: null,
      pendingAction: "sign-out",
    }));

    const token = await authStorage.getToken();

    try {
      await authApi.signOut(token);
    } catch {
      // Local logout must still succeed even if the server-side sign-out call fails.
    } finally {
      await authStorage.clearAll();
      syncPromiseRef.current = null;
      setState((current) => ({
        ...current,
        ...applyAnonymousState(),
        errorMessage: null,
        lastSyncError: null,
        pendingAction: null,
      }));
    }
  }

  const value: AuthContextValue = {
    apiBaseUrl,
    configError: state.configError,
    errorMessage: state.errorMessage,
    isAuthenticated: state.status === "authenticated" && Boolean(state.session),
    isBusy: state.pendingAction !== null,
    isHydrated: state.isHydrated,
    lastSyncAt: state.lastSyncAt,
    lastSyncError: state.lastSyncError,
    refreshSession,
    session: state.session,
    signIn,
    signOut,
    signUp,
    status: state.status,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
