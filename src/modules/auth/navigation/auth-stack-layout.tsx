import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useThemeColor } from "heroui-native";

export function AuthStackLayout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const [themeColorForeground, themeColorBackground] = useThemeColor([
    "foreground",
    "background",
  ]);

  if (!isHydrated) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/demo" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: themeColorForeground,
        headerStyle: {
          backgroundColor: themeColorBackground,
        },
        contentStyle: {
          backgroundColor: themeColorBackground,
        },
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
    </Stack>
  );
}
