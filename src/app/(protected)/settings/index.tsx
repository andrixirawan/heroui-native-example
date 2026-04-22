import { StatusBar } from "expo-status-bar";
import { Button, Card } from "heroui-native";

import { AppText } from "@/components/app-text";
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useAuth } from "@/modules/auth";

export default function SettingsScreen() {
  const { isDark } = useAppTheme();
  const { signOut, session } = useAuth();

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
      <StatusBar style={isDark ? "light" : "dark"} />
    </ScreenScrollView>
  );
}
