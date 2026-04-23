import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";

import { AuthApiError } from "@/modules/auth/lib/auth-errors";

type GoogleIdTokenSignInResult = {
  accessToken?: string;
  nonce?: string;
  token: string;
};

function getTrimmedEnvValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

function getPlatformClientId() {
  const webClientId = getTrimmedEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  );
  const iosClientId = getTrimmedEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  );
  const androidClientId = getTrimmedEnvValue(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  );

  return {
    androidClientId,
    clientId:
      Platform.OS === "ios"
        ? iosClientId
        : Platform.OS === "android"
          ? androidClientId
          : webClientId,
    iosClientId,
    webClientId,
  };
}

function getMissingClientIdMessage() {
  if (Platform.OS === "ios") {
    return "Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID first to enable native Google sign-in on iOS.";
  }

  if (Platform.OS === "android") {
    return "Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID first to enable native Google sign-in on Android.";
  }

  return "Set the Google client ID first to enable Google sign-in.";
}

export function useGoogleIdTokenSignIn() {
  const { androidClientId, clientId, iosClientId, webClientId } =
    getPlatformClientId();
  const isConfigured = Boolean(clientId);

  const [request, , promptAsync] = Google.useAuthRequest({
    androidClientId,
    clientId: clientId ?? "missing-google-client-id",
    iosClientId,
    webClientId,
  });

  async function signIn(): Promise<GoogleIdTokenSignInResult> {
    if (!isConfigured) {
      throw new AuthApiError(getMissingClientIdMessage(), 0, "AUTH_CONFIG_ERROR");
    }

    if (!request) {
      throw new AuthApiError(
        "Google sign-in belum siap. Tunggu sebentar lalu coba lagi.",
        0,
        "GOOGLE_AUTH_NOT_READY",
      );
    }

    const response = await promptAsync();

    if (response.type === "cancel" || response.type === "dismiss") {
      throw new AuthApiError(
        "Google sign-in dibatalkan.",
        0,
        "GOOGLE_SIGN_IN_CANCELLED",
      );
    }

    if (response.type !== "success") {
      const message =
        "error" in response && response.error?.message
          ? response.error.message
          : "Google sign-in gagal.";

      throw new AuthApiError(message, 0, "GOOGLE_SIGN_IN_FAILED");
    }

    const token = response.authentication?.idToken ?? response.params.id_token;
    const accessToken =
      response.authentication?.accessToken ?? response.params.access_token;

    if (!token) {
      throw new AuthApiError(
        "Google tidak mengembalikan ID token. Pastikan OAuth client yang dipakai sudah benar.",
        0,
        "GOOGLE_ID_TOKEN_MISSING",
      );
    }

    return {
      accessToken,
      nonce: request.nonce,
      token,
    };
  }

  return {
    isConfigured,
    isReady: Boolean(request),
    signIn,
  };
}
