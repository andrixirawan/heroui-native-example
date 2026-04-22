import { Redirect, Slot, type Href } from "expo-router";

import { useAuth } from "@/modules/auth";

export default function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  return <Slot />;
}
