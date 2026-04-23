import { Link, router, type Href } from "expo-router";
import {
  Button,
  Card,
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

import { EyeIcon } from "@/components/icons/eye";
import { EyeSlashIcon } from "@/components/icons/eye-slash";
import { LockIcon } from "@/components/icons/lock";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { AuthApiError } from "@/modules/auth/lib/auth-errors";

export function SignUpScreen() {
  const { configError, errorMessage, refreshSession, signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const emailInputRef = useRef<TextInput | null>(null);
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
    if (!name.trim() || !email.trim() || !password) {
      setSubmitError("Nama, email, dan password wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setSubmitError("Password minimal 8 karakter sesuai kontrak backend.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await signUp({
        name,
        email,
        password,
      });
      router.replace("/demo" as Href);
    } catch (error) {
      setSubmitError(
        error instanceof AuthApiError
          ? error.message
          : "Tidak bisa register sekarang. Coba lagi.",
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
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable className="flex-1 justify-center" onPress={Keyboard.dismiss}>
          <View className="gap-5">
            <View>
              <Card.Title className="text-[28px]">Create account</Card.Title>
            </View>

            <TextField isRequired isInvalid={Boolean(helperError)}>
              <Label>Full name</Label>
              <Input
                autoCapitalize="words"
                blurOnSubmit={false}
                onChangeText={setName}
                onSubmitEditing={() => emailInputRef.current?.focus()}
                placeholder="Jane Doe"
                returnKeyType="next"
                value={name}
              />
            </TextField>

            <TextField isRequired isInvalid={Boolean(helperError)}>
              <Label>Email</Label>
              <Input
                ref={emailInputRef}
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
            </TextField>

            <TextField isRequired isInvalid={Boolean(helperError)}>
              <Label>Password</Label>
              <View className="w-full flex-row items-center">
                <Input
                  ref={passwordInputRef}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  className="flex-1 px-10"
                  onChangeText={setPassword}
                  onSubmitEditing={() => void handleSubmit()}
                  placeholder="Minimum 8 characters"
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  value={password}
                />
                <View className="absolute left-3.5" pointerEvents="none">
                  <LockIcon
                    size={16}
                    colorClassName="accent-field-placeholder"
                  />
                </View>
                <Pressable
                  className="absolute right-4"
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeSlashIcon
                      size={16}
                      colorClassName="accent-field-placeholder"
                    />
                  ) : (
                    <EyeIcon
                      size={16}
                      colorClassName="accent-field-placeholder"
                    />
                  )}
                </Pressable>
              </View>
              {helperError ? <FieldError>{helperError}</FieldError> : null}
            </TextField>

            <Button
              isDisabled={Boolean(configError) || isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Button.Label>Create account</Button.Label>
              )}
            </Button>

            <Link asChild href={"/(auth)/sign-in" as Href}>
              <Pressable className="self-center active:opacity-70">
                <Text className="text-sm font-semibold text-primary">
                  Sudah punya akun? Balik ke login.
                </Text>
              </Pressable>
            </Link>
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
