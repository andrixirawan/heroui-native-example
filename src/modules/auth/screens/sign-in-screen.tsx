import { Link, router, type Href } from "expo-router";
import {
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
} from "heroui-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppText } from "@/components/app-text";
import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { LockIcon } from "@/components/icons/lock";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { AuthApiError } from "@/modules/auth/lib/auth-api";

export function SignInScreen() {
  const { configError, errorMessage, refreshSession, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const passwordInputRef = useRef<TextInput | null>(null);

  async function handleRefresh() {
    setIsRefreshing(true);
    Keyboard.dismiss();

    try {
      await refreshSession({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setSubmitError("Email dan password wajib diisi.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signIn({
        email,
        password,
        rememberMe: true,
      });
      router.replace("/demo" as Href);
    } catch (error) {
      setSubmitError(
        error instanceof AuthApiError ? error.message : "Tidak bisa login sekarang. Coba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const helperError = configError ?? submitError ?? errorMessage;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="min-h-full justify-center px-5 py-8"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable className="flex-1 justify-center" onPress={Keyboard.dismiss}>
          <View className="gap-5">
            <View className="rounded-[32px] bg-accent px-6 py-7">
              <AppText className="text-sm font-semibold uppercase tracking-[1.4px] text-accent-foreground/70">
                Better Auth Native
              </AppText>
              <AppText className="mt-3 text-[34px] font-bold leading-[38px] text-accent-foreground">
                Login flow aman, ringan, dan siap production.
              </AppText>
              <AppText className="mt-3 text-[15px] leading-6 text-accent-foreground/80">
                Token disimpan dengan SecureStore, session direfresh lewat
                {" "}`/api/auth/get-session`, dan splash screen baru hilang setelah bootstrap siap.
              </AppText>
            </View>

            <Card className="border border-divider bg-content1 shadow-none">
              <Card.Body className="gap-5 p-6">
                <View>
                  <Card.Title className="text-[28px]">Sign in</Card.Title>
                  <Card.Description className="mt-2">
                    Masuk untuk membuka seluruh area demo yang sekarang diproteksi session.
                  </Card.Description>
                </View>

                <TextField isRequired isInvalid={Boolean(helperError)}>
                  <Label>Email</Label>
                  <Input
                    autoCapitalize="none"
                    autoComplete="email"
                    blurOnSubmit={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    placeholder="you@example.com"
                    returnKeyType="next"
                    value={email}
                  />
                  <Description>Kami pakai email ini untuk mengikat session aktif.</Description>
                </TextField>

                <TextField isRequired isInvalid={Boolean(helperError)}>
                  <Label>Password</Label>
                  <View className="w-full flex-row items-center">
                    <Input
                      ref={passwordInputRef}
                      autoCapitalize="none"
                      autoComplete="password"
                      className="flex-1 px-10"
                      onChangeText={setPassword}
                      onSubmitEditing={() => void handleSubmit()}
                      placeholder="Your password"
                      returnKeyType="done"
                      secureTextEntry={!showPassword}
                      value={password}
                    />
                    <View className="absolute left-3.5" pointerEvents="none">
                      <LockIcon size={16} colorClassName="accent-field-placeholder" />
                    </View>
                    <Pressable
                      className="absolute right-4"
                      onPress={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon size={16} colorClassName="accent-field-placeholder" />
                      ) : (
                        <EyeIcon size={16} colorClassName="accent-field-placeholder" />
                      )}
                    </Pressable>
                  </View>
                  <Description hideOnInvalid>
                    Password dikirim ke endpoint Better Auth email sign-in.
                  </Description>
                  {helperError ? <FieldError>{helperError}</FieldError> : null}
                </TextField>

                <Button isDisabled={Boolean(configError) || isSubmitting} onPress={handleSubmit}>
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Button.Label>Login</Button.Label>
                  )}
                </Button>

                <Link asChild href={"/(auth)/sign-up" as Href}>
                  <Pressable className="self-center active:opacity-70">
                    <Text className="text-sm font-semibold text-primary">
                      Belum punya akun? Register dulu.
                    </Text>
                  </Pressable>
                </Link>
              </Card.Body>
            </Card>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
