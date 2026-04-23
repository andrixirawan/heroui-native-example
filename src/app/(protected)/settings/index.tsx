import { StatusBar } from "expo-status-bar";
import { Button, Card } from "heroui-native";

import { AppText } from "@/components/app-text";
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { useAppTheme } from "@/contexts/app-theme-context";
import { openInAppBrowser } from "@/helpers/utils/open-in-app-browser";
import { useAuth } from "@/modules/auth";

export default function SettingsScreen() {
  const { isDark } = useAppTheme();
  const { signOut, session } = useAuth();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  return (
    <ScreenScrollView className="flex-1 bg-background p-5">
      <Card className="border border-divider bg-content1 shadow-none">
        <Card.Header>
          <Card.Title className="text-2xl">Settings</Card.Title>
          <Card.Description className="mt-1">
            Kelola akun untuk sesi yang sedang aktif.
          </Card.Description>
        </Card.Header>
        <Card.Body className="gap-3">
          <AppText className="text-xs uppercase tracking-[1px] text-muted">
            Account
          </AppText>
          <AppText className="text-base text-foreground">
            {session?.user.name ?? "-"}
          </AppText>
          <AppText className="text-sm text-muted">{session?.user.email ?? "-"}</AppText>
          <Button className="mt-2" variant="danger-soft" onPress={() => void signOut()}>
            <Button.Label>Logout</Button.Label>
          </Button>
        </Card.Body>
      </Card>

      {apiUrl ? (
        <Card className="mt-4 border border-divider bg-content1 shadow-none">
          <Card.Header>
            <Card.Title className="text-xl">Internal WebView</Card.Title>
            <Card.Description className="mt-1">
              Buka halaman web langsung di dalam app tanpa pindah ke browser eksternal.
            </Card.Description>
          </Card.Header>
          <Card.Body className="gap-3">
            <AppText className="text-xs uppercase tracking-[1px] text-muted">
              Target URL
            </AppText>
            <AppText className="text-sm text-foreground">{apiUrl}</AppText>
            <Button
              className="mt-2"
              onPress={() =>
                openInAppBrowser(apiUrl, {
                  title: "Backend API",
                })
              }
            >
              <Button.Label>Buka di Dalam App</Button.Label>
            </Button>
          </Card.Body>
        </Card>
      ) : null}

      <StatusBar style={isDark ? "light" : "dark"} />
    </ScreenScrollView>
  );
}
