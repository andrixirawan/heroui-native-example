import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SessionEnvelope } from "@/modules/auth/types/auth-types";

const TOKEN_KEY = "heroui-native-example.session-token";
const SESSION_KEY = "heroui-native-example.session-cache";

function usesCookieSession() {
  return Platform.OS === "web";
}

function canUseWebStorage() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "localStorage" in window
  );
}

async function getItem(key: string) {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function deleteItem(key: string) {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function parseSession(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as SessionEnvelope;
  } catch {
    return null;
  }
}

export const authStorage = {
  getToken() {
    if (usesCookieSession()) {
      return Promise.resolve<string | null>(null);
    }

    return getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    if (usesCookieSession()) {
      return Promise.resolve();
    }

    return setItem(TOKEN_KEY, token);
  },

  clearToken() {
    if (usesCookieSession()) {
      return Promise.resolve();
    }

    return deleteItem(TOKEN_KEY);
  },

  async getSessionSnapshot() {
    return parseSession(await getItem(SESSION_KEY));
  },

  setSessionSnapshot(session: SessionEnvelope) {
    return setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSessionSnapshot() {
    return deleteItem(SESSION_KEY);
  },

  async clearAll() {
    await Promise.all([deleteItem(TOKEN_KEY), deleteItem(SESSION_KEY)]);
  },
};
