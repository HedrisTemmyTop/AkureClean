import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Animatable from "react-native-animatable";
import { KeyRound } from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { authService } from "../../services/auth";
import { parseApiError } from "../../services/api";
import { AuthStackParamList } from "../../navigation/AuthStack";

type NavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "ForgotPassword"
>;
type ForgotPasswordRouteProp = RouteProp<AuthStackParamList, "ForgotPassword">;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ForgotPasswordRouteProp>();

  const [email, setEmail] = useState(route.params?.email || "");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const msg = await authService.forgotPassword(cleanEmail);
      setStep("reset");
      setCooldown(60);
      Alert.alert("Reset Code Sent", msg);
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit reset code.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        "Weak Password",
        "Your new password must be at least 6 characters long.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const msg = await authService.resetPassword(
        email.trim().toLowerCase(),
        cleanOtp,
        newPassword,
      );
      Alert.alert("Password Reset", msg, [
        {
          text: "Sign In",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
    } catch (e) {
      Alert.alert("Reset Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.iconCircle}>
          <KeyRound size={34} color={theme.colors.primary} />
        </View>
        <AppText variant="h1" style={{ textAlign: "center" }}>
          {step === "email" ? "Forgot Password?" : "Reset Password"}
        </AppText>
        <AppText
          variant="body"
          color={theme.colors.textSecondary}
          style={styles.subtitle}
        >
          {step === "email"
            ? "Enter your email address and we'll send you a 6-digit OTP to reset your password."
            : `Enter the 6-digit OTP sent to ${email.trim().toLowerCase()} and choose a new password.`}
        </AppText>
      </Animatable.View>

      {step === "email" ? (
        <View style={styles.form}>
          <AppInput
            label="Email Address"
            placeholder="Enter your registered email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <AppButton
            title="Send Reset Code"
            fullWidth
            loading={isLoading}
            onPress={handleRequestOtp}
            style={{ marginTop: theme.spacing.md }}
          />

          <AppButton
            title="Back to Sign In"
            variant="outline"
            fullWidth
            onPress={() => navigation.goBack()}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <AppInput
            label="6-Digit Reset Code"
            placeholder="123456"
            value={otp}
            onChangeText={(text) =>
              setOtp(text.replace(/[^0-9]/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />

          <AppInput
            label="New Password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
          />

          <AppInput
            label="Confirm New Password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
          />

          <AppButton
            title="Reset Password"
            fullWidth
            loading={isLoading}
            onPress={handleResetPassword}
            style={{ marginTop: theme.spacing.md }}
          />

          <View style={styles.resendRow}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Didn't get the code?{" "}
            </AppText>
            <TouchableOpacity
              onPress={handleRequestOtp}
              disabled={cooldown > 0 || isLoading}
            >
              <AppText
                variant="bodySmall"
                weight="600"
                color={
                  cooldown > 0 || isLoading
                    ? theme.colors.textSecondary
                    : theme.colors.primary
                }
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
              </AppText>
            </TouchableOpacity>
          </View>

          <AppButton
            title="Change Email"
            variant="outline"
            fullWidth
            onPress={() => setStep("email")}
            style={{ marginTop: theme.spacing.lg }}
          />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    textAlign: "center",
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
});
