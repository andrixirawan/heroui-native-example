import { StatusBar } from "expo-status-bar";
import { Card, Chip, cn } from "heroui-native";
import { View } from "react-native";

import { AppText } from "@/components/app-text";
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useAuth } from "@/modules/auth";

export default function HomeScreen() {
  const { isDark } = useAppTheme();
  const { session } = useAuth();

  return (
    <ScreenScrollView className="flex-1 bg-background p-5">
      <Card
        className={cn(
          "border border-divider bg-content1 shadow-none",
          isDark && "border-zinc-800"
        )}
      >
        <Card.Header className="flex-row items-center justify-between">
          <Card.Title className="text-2xl">Home</Card.Title>
          <Chip variant="secondary">
            <Chip.Label>Authenticated</Chip.Label>
          </Chip>
        </Card.Header>
        <Card.Body className="gap-2">
          <AppText className="text-base text-foreground">
            Selamat datang, {session?.user.name ?? "User"}.
          </AppText>
          <AppText className="text-sm text-muted">
            Ini halaman Home untuk area protected.
          </AppText>
        </Card.Body>
      </Card>

      <View className="mt-4 rounded-2xl border border-divider bg-content1 p-4">
        <AppText className="text-xs uppercase tracking-[1px] text-muted">
          Signed in as
        </AppText>
        <AppText className="mt-2 text-base text-foreground">
          {session?.user.email ?? "-"}
        </AppText>
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ScreenScrollView>
  );
}
