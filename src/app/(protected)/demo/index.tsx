import Feather from "@expo/vector-icons/Feather";
import { useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Button, Card, Chip, cn } from "heroui-native";
import { useState, type FC } from "react";
import { Image, Pressable, RefreshControl, View, type ImageSourcePropType } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import HomeComponentsDark from "@assets/images/home-components-dark.png";
import HomeComponentsLight from "@assets/images/home-components-light.png";
import HomeShowcasesDark from "@assets/images/home-showcases-dark.png";
import HomeShowcasesLight from "@assets/images/home-showcases-light.png";
import HomeThemesDark from "@assets/images/home-themes-dark.png";
import HomeThemesLight from "@assets/images/home-themes-light.png";
import { AppText } from "@/components/app-text";
import { ScreenScrollView } from "@/components/screen-scroll-view";
import { useAppTheme } from "@/contexts/app-theme-context";
import { COMPONENTS } from "@/helpers/data/components";
import { useAuth } from "@/modules/auth";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedView = Animated.createAnimatedComponent(View);

const StyledFeather = withUniwind(Feather);

type HomeCardProps = {
  title: string;
  imageLight: ImageSourcePropType;
  imageDark: ImageSourcePropType;
  count: number;
  footer: string;
  path: string;
};

const cards: HomeCardProps[] = [
  {
    title: "Components",
    imageLight: HomeComponentsLight,
    imageDark: HomeComponentsDark,
    count: COMPONENTS.length,
    footer: "Explore all components",
    path: "/demo/components",
  },
  {
    title: "Themes",
    imageLight: HomeThemesLight,
    imageDark: HomeThemesDark,
    count: 4,
    footer: "Try different themes",
    path: "/demo/themes",
  },
  {
    title: "Showcases",
    imageLight: HomeShowcasesLight,
    imageDark: HomeShowcasesDark,
    count: 6,
    footer: "View components in action",
    path: "/demo/showcases",
  },
];

const HomeCard: FC<HomeCardProps & { index: number }> = ({
  title,
  imageLight,
  imageDark,
  count,
  footer,
  path,
  index,
}) => {
  const router = useRouter();

  const { isDark } = useAppTheme();

  const rLightImageStyle = useAnimatedStyle(() => {
    return {
      opacity: isDark ? 0 : withTiming(0.4),
    };
  });

  const rDarkImageStyle = useAnimatedStyle(() => {
    return {
      opacity: isDark ? withTiming(0.4) : 0,
    };
  });

  return (
    <AnimatedPressable
      entering={FadeInDown.duration(300)
        .delay(index * 100)
        .easing(Easing.out(Easing.ease))}
      onPress={() => router.push(path as Href)}
    >
      <Card
        className={cn(
          "p-0 border border-zinc-200 shadow-none",
          isDark && "border-zinc-900",
        )}
      >
        <AnimatedView
          entering={FadeIn}
          className="absolute inset-0 w-full h-full"
        >
          <AnimatedImage
            source={imageLight}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
            style={rLightImageStyle}
          />
          <AnimatedImage
            source={imageDark}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
            style={rDarkImageStyle}
          />
        </AnimatedView>
        <View className="gap-4">
          <Card.Header className="p-3">
            <Chip size="sm" className="bg-background/25">
              <Chip.Label className="text-foreground/85">
                {`${count} total`}
              </Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Body className="h-16" />
          <Card.Footer className="px-3 pb-3 flex-row items-end gap-4">
            <View className="flex-1">
              <Card.Title
                className="text-2xl text-foreground/85"
                maxFontSizeMultiplier={1.75}
              >
                {title}
              </Card.Title>
              <Card.Description className="text-foreground/65 pl-0.5">
                {footer}
              </Card.Description>
            </View>
            <View className="size-9 rounded-3xl bg-background/25 items-center justify-center">
              <StyledFeather
                name="arrow-up-right"
                size={20}
                className="text-foreground"
              />
            </View>
          </Card.Footer>
        </View>
      </Card>
    </AnimatedPressable>
  );
};

export default function App() {
  const { isDark } = useAppTheme();
  const { lastSyncError, refreshSession, session, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await refreshSession({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }

  const expiresLabel = session?.session.expiresAt
    ? new Date(session.session.expiresAt).toLocaleString()
    : "-";

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <AppText className="text-muted text-base text-center my-4">
        v1.0.2
      </AppText>
      <Card className="mb-6 border border-divider bg-content1 shadow-none">
        <Card.Body className="gap-4 p-5">
          <View>
            <Card.Title className="text-[24px]">Auth session</Card.Title>
            <Card.Description className="mt-2">
              Demo repo ini sekarang memakai Better Auth native flow dengan bearer token dan
              `get-session` sebagai source of truth.
            </Card.Description>
          </View>

          <View className="gap-3">
            <View>
              <AppText className="text-xs font-semibold uppercase tracking-[1.1px] text-muted">
                User
              </AppText>
              <AppText className="mt-1 text-base text-foreground">
                {session?.user.name ?? "-"} · {session?.user.email ?? "-"}
              </AppText>
            </View>

            <View>
              <AppText className="text-xs font-semibold uppercase tracking-[1.1px] text-muted">
                Expires at
              </AppText>
              <AppText className="mt-1 text-base text-foreground">{expiresLabel}</AppText>
            </View>

            {lastSyncError ? (
              <View className="rounded-2xl bg-danger/10 px-4 py-3">
                <AppText className="text-sm leading-5 text-danger">{lastSyncError}</AppText>
              </View>
            ) : null}
          </View>

          <View className="gap-3">
            <Button variant="secondary" onPress={() => void refreshSession()}>
              <Button.Label>Refresh session</Button.Label>
            </Button>
            <Button variant="danger-soft" onPress={() => void signOut()}>
              <Button.Label>Logout</Button.Label>
            </Button>
          </View>
        </Card.Body>
      </Card>
      <View className="gap-6">
        {cards.map((card, index) => (
          <HomeCard
            key={card.title}
            title={card.title}
            imageLight={card.imageLight}
            imageDark={card.imageDark}
            count={card.count}
            footer={card.footer}
            path={card.path}
            index={index}
          />
        ))}
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ScreenScrollView>
  );
}

