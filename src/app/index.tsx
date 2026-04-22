import { Redirect, type Href } from "expo-router";

import { useAuth } from "@/modules/auth";

export default function IndexScreen() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return null;
  }

  const href = (isAuthenticated ? "/home" : "/(auth)/sign-in") as Href;

  return <Redirect href={href} />;
}
