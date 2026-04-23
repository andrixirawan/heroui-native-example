import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SessionEnvelope } from "@/modules/auth/types/auth-types";

const AUTH_STORAGE_PREFIX = "heroui-native-example";
const FALLBACK_AUTH_BASE_URL = "http://localhost.invalid";

function getClientType() {
  if (Platform.OS === "web") {
    return "web";
  }

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

export const authClient = createAuthClient({
  baseURL: getApiBaseUrl() ?? FALLBACK_AUTH_BASE_URL,
  fetchOptions: {
    headers: {
      "X-Client-Type": getClientType(),
    },
  },
  plugins: [
    expoClient({
      storage: SecureStore,
      storagePrefix: AUTH_STORAGE_PREFIX,
    }),
    inferAdditionalFields({
      user: {
        firstName: {
          type: "string",
          required: false,
        },
        lastName: {
          type: "string",
          required: false,
        },
        phoneNumber: {
          type: "string",
          required: false,
        },
      },
      session: {
        clientType: {
          type: "string",
          required: false,
        },
      },
    }),
  ],
});

type AuthSessionStoreSnapshot = {
  data: SessionEnvelope | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  refetch: (queryParams?: {
    query?: { disableCookieCache?: boolean; disableRefresh?: boolean };
  }) => Promise<void>;
};

export function getSessionStoreSnapshot() {
  return authClient.$store.atoms.session.get() as AuthSessionStoreSnapshot;
}
