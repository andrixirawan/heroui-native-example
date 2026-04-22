import Feather from "@expo/vector-icons/Feather";
import { Redirect, Tabs, type Href } from "expo-router";
import { useThemeColor } from "heroui-native";

import { useAuth } from "@/modules/auth";

export default function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const themeColorAccent = useThemeColor("accent");
  const themeColorMuted = useThemeColor("muted");
  const themeColorSurface = useThemeColor("surface");
  const themeColorSeparator = useThemeColor("separator");

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
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="demo"
        options={{
          title: "Demo",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
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
