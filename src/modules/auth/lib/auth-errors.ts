import { BetterFetchError } from "@better-fetch/fetch";
import { Platform } from "react-native";

function isOriginErrorMessage(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("missing or null origin") ||
    normalizedMessage.includes("origin not allowed")
  );
}

function getCurrentWebOrigin() {
  if (typeof window === "undefined" || !window.location?.origin) {
    return null;
  }

  return window.location.origin;
}

function getOriginErrorMessage() {
  if (Platform.OS === "web") {
    const currentOrigin = getCurrentWebOrigin();
    const originLabel = currentOrigin
      ? `origin ${currentOrigin}`
      : "origin frontend ini";

    return `Backend menolak login dari ${originLabel}. Tambahkan origin frontend ke BETTER_AUTH_TRUSTED_ORIGINS atau API_ALLOWED_ORIGINS di backend.`;
  }

  return "Backend masih menolak request auth Expo karena validasi origin. Pastikan plugin @better-auth/expo aktif di server dan URL backend yang dipakai aplikasi sudah benar.";
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

function getErrorDetails(
  error:
    | BetterFetchError
    | { status?: number; statusText?: string; code?: string },
) {
  if (error instanceof BetterFetchError) {
    const errorPayload =
      error.error && typeof error.error === "object"
        ? (error.error as Record<string, unknown>)
        : null;

    const message =
      typeof errorPayload?.message === "string"
        ? errorPayload.message
        : typeof errorPayload?.error === "string"
          ? errorPayload.error
          : error.message;

    const code =
      typeof errorPayload?.code === "string" ? errorPayload.code : undefined;

    return {
      message,
      status: error.status,
      code,
    };
  }

  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;

    return {
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : typeof candidate.error === "string"
            ? candidate.error
            : "Authentication failed.",
      status: typeof candidate.status === "number" ? candidate.status : 0,
      code: typeof candidate.code === "string" ? candidate.code : undefined,
    };
  }

  return {
    message: "Authentication failed.",
    status: 0,
    code: undefined,
  };
}

export function toAuthApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof AuthApiError) {
    if (isOriginErrorMessage(error.message)) {
      return new AuthApiError(
        getOriginErrorMessage(),
        error.status,
        error.code,
      );
    }

    return error;
  }

  if (error instanceof BetterFetchError) {
    const details = getErrorDetails(error);
    const message = isOriginErrorMessage(details.message)
      ? getOriginErrorMessage()
      : details.message || fallbackMessage;

    return new AuthApiError(message, details.status, details.code);
  }

  if (error instanceof Error) {
    const message = isOriginErrorMessage(error.message)
      ? getOriginErrorMessage()
      : error.message || fallbackMessage;

    return new AuthApiError(message, 0);
  }

  if (error && typeof error === "object") {
    const details = getErrorDetails(
      error as { status?: number; statusText?: string; code?: string },
    );
    const message = isOriginErrorMessage(details.message)
      ? getOriginErrorMessage()
      : details.message || fallbackMessage;

    return new AuthApiError(message, details.status, details.code);
  }

  return new AuthApiError(fallbackMessage, 0);
}
