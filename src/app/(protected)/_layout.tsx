import { Feather } from "@expo/vector-icons";
import { Redirect, Tabs, type Href } from "expo-router";
import { useThemeColor } from "heroui-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { useAuth } from "@/modules/auth";

export default function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { isDark } = useAppTheme();
  const themeColorAccent = useThemeColor("accent");
  const themeColorMuted = useThemeColor("muted");
  const themeColorSurface = useThemeColor("surface");
  const themeColorSeparator = useThemeColor("separator");
  const inactiveIconColor = isDark ? "#8B8EA1" : "#6B7280";
  const activeIconColor = isDark ? "#FFFFFF" : "#111827";

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColorAccent,
        tabBarInactiveTintColor: themeColorMuted,
        tabBarStyle: {
          backgroundColor: themeColorSurface,
          borderTopColor: themeColorSeparator,
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <Feather
              name="home"
              size={20}
              color={focused ? activeIconColor : inactiveIconColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="demo"
        options={{
          title: "Demo",
          tabBarIcon: ({ focused }) => (
            <Feather
              name="grid"
              size={20}
              color={focused ? activeIconColor : inactiveIconColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <Feather
              name="settings"
              size={20}
              color={focused ? activeIconColor : inactiveIconColor}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="webview"
        options={{
          href: null,
          title: "Internal Web",
          tabBarStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
