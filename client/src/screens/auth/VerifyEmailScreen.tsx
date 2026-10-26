import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Animatable from "react-native-animatable";
import { MailCheck } from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/auth";
import { parseApiError } from "../../services/api";
import { AuthStackParamList } from "../../navigation/AuthStack";

type NavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "VerifyEmail"
>;
type VerifyEmailRouteProp = RouteProp<AuthStackParamList, "VerifyEmail">;

export const VerifyEmailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VerifyEmailRouteProp>();
  const { email } = route.params;

  const { verifyEmail } = useAuth();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      Alert.alert(
        "Invalid Code",
        "Please enter the 6-digit verification code sent to your email.",
      );
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email, cleanOtp);
      // AuthContext updates `user` and automatically navigates to role dashboard
    } catch (e) {
      Alert.alert("Verification Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const msg = await authService.resendVerificationOtp(email);
      setCooldown(60);
      Alert.alert("Code Sent", msg);
    } catch (e) {
      Alert.alert("Could Not Resend Code", parseApiError(e));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.iconCircle}>
          <MailCheck size={36} color={theme.colors.primary} />
        </View>
        <AppText variant="h1" style={{ textAlign: "center" }}>
          Verify Your Email
        </AppText>
        <AppText
          variant="body"
          color={theme.colors.textSecondary}
          style={styles.subtitle}
        >
          We sent a 6-digit verification code to{"\n"}
          <AppText variant="body" weight="600" color={theme.colors.text}>
            {email}
          </AppText>
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        <AppInput
          label="6-Digit Verification Code"
          placeholder="123456"
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.otpInput}
        />

        <AppButton
          title="Verify & Continue"
          fullWidth
          loading={isLoading}
          onPress={handleVerify}
          disabled={otp.trim().length !== 6}
          style={styles.verifyBtn}
        />

        <View style={styles.resendRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Didn't receive the code?{" "}
          </AppText>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || isResending}
          >
            <AppText
              variant="bodySmall"
              weight="600"
              color={
                cooldown > 0 || isResending
                  ? theme.colors.textSecondary
                  : theme.colors.primary
              }
            >
              {isResending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend Code"}
            </AppText>
          </TouchableOpacity>
        </View>

        <AppButton
          title="Back to Sign In"
          variant="outline"
          fullWidth
          onPress={() => navigation.navigate("Login")}
          style={{ marginTop: theme.spacing.lg }}
        />
      </View>
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
  verifyBtn: {
    marginTop: theme.spacing.md,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
});
