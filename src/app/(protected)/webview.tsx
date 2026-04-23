import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type {
  ShouldStartLoadRequest,
  WebViewErrorEvent,
  WebViewNavigation,
} from "react-native-webview/lib/WebViewTypes";

import { AppText } from "@/components/app-text";

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

const getSingleParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const normalizeHttpUrl = (url?: string | string[]) => {
  const rawUrl = getSingleParam(url);

  if (!rawUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(rawUrl);

    if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

const getTitleLabel = (value?: string | string[]) => {
  const title = getSingleParam(value)?.trim();

  return title || "Internal Web";
};

export default function InternalWebViewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const initialUrl = useMemo(() => normalizeHttpUrl(params.url), [params.url]);
  const fallbackTitle = useMemo(() => getTitleLabel(params.title), [params.title]);
  const [title, setTitle] = useState(fallbackTitle);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [
    themeColorForeground,
    themeColorMuted,
    themeColorSeparator,
    themeColorAccent,
  ] = useThemeColor(["foreground", "muted", "separator", "accent"] as const);

  const handleNavigationStateChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setCanGoForward(state.canGoForward);
    setIsLoading(state.loading);

    if (state.title?.trim()) {
      setTitle(state.title);
    }
  }, []);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: ShouldStartLoadRequest) => {
      try {
        const parsedUrl = new URL(request.url);

        if (SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
          return true;
        }

        void Linking.openURL(request.url);
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const handleReload = useCallback(() => {
    setErrorMessage(null);
    webViewRef.current?.reload();
  }, []);

  const controlStyle = (enabled: boolean) => ({
    opacity: enabled ? 1 : 0.45,
  });

  if (!initialUrl) {
    return (
      <View
        className="flex-1 bg-background px-5"
        style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
      >
        <Pressable
          accessibilityRole="button"
          className="mb-6 h-11 w-11 items-center justify-center rounded-full border"
          onPress={() => router.back()}
          style={{ borderColor: themeColorSeparator }}
        >
          <Feather name="arrow-left" size={20} color={themeColorForeground} />
        </Pressable>

        <View className="rounded-3xl border border-divider bg-content1 p-5">
          <AppText className="text-xl text-foreground">URL tidak valid</AppText>
          <AppText className="mt-2 text-sm text-muted">
            Internal browser ini hanya mendukung link `http://` atau `https://`.
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View
        className="border-b bg-background px-4 pb-3"
        style={{
          paddingTop: insets.top + (Platform.OS === "android" ? 8 : 4),
          borderBottomColor: themeColorSeparator,
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            accessibilityLabel="Tutup internal browser"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full border"
            onPress={() => router.back()}
            style={{ borderColor: themeColorSeparator }}
          >
            <Feather name="x" size={20} color={themeColorForeground} />
          </Pressable>

          <View className="min-w-0 flex-1 items-center px-2">
            <AppText className="text-base text-foreground" numberOfLines={1}>
              {title}
            </AppText>
            <AppText className="mt-1 text-xs text-muted" numberOfLines={1}>
              {initialUrl}
            </AppText>
          </View>

          <Pressable
            accessibilityLabel="Refresh halaman"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full border"
            onPress={handleReload}
            style={{ borderColor: themeColorSeparator }}
          >
            <Feather name="rotate-cw" size={18} color={themeColorForeground} />
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-center justify-center gap-3">
          <Pressable
            accessibilityLabel="Halaman sebelumnya"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full border"
            disabled={!canGoBack}
            onPress={() => webViewRef.current?.goBack()}
            style={[
              { borderColor: themeColorSeparator },
              controlStyle(canGoBack),
            ]}
          >
            <Feather
              name="chevron-left"
              size={18}
              color={canGoBack ? themeColorForeground : themeColorMuted}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Halaman berikutnya"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full border"
            disabled={!canGoForward}
            onPress={() => webViewRef.current?.goForward()}
            style={[
              { borderColor: themeColorSeparator },
              controlStyle(canGoForward),
            ]}
          >
            <Feather
              name="chevron-right"
              size={18}
              color={canGoForward ? themeColorForeground : themeColorMuted}
            />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 bg-content1">
        <WebView
          ref={webViewRef}
          allowsBackForwardNavigationGestures
          domStorageEnabled
          javaScriptEnabled
          onError={(event: WebViewErrorEvent) => {
            setErrorMessage(
              event.nativeEvent.description || "Halaman gagal dimuat."
            );
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setErrorMessage(null);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          originWhitelist={["http://*", "https://*"]}
          setSupportMultipleWindows={false}
          sharedCookiesEnabled
          source={{ uri: initialUrl }}
        />

        {isLoading ? (
          <View className="absolute inset-x-0 top-0 items-center pt-4">
            <ActivityIndicator color={themeColorAccent} />
          </View>
        ) : null}

        {errorMessage ? (
          <View className="absolute inset-0 items-center justify-center bg-background/95 px-6">
            <View className="w-full rounded-3xl border border-divider bg-content1 p-5">
              <AppText className="text-lg text-foreground">Gagal membuka halaman</AppText>
              <AppText className="mt-2 text-sm text-muted">{errorMessage}</AppText>

              <Pressable
                accessibilityRole="button"
                className="mt-5 h-11 items-center justify-center rounded-2xl bg-accent px-4"
                onPress={handleReload}
              >
                <AppText className="font-medium text-background">Coba lagi</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
