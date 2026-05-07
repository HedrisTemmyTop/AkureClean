import React, { useState } from "react";
import { View, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { parseApiError } from "../../services/api";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, signInAs } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      console.log("login response", email.trim().toLowerCase(), password);
      await login(email.trim().toLowerCase(), password);
      // Navigation handled automatically by AuthContext state change
    } catch (e) {
      Alert.alert("Login Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: Role) => {
    setIsLoading(true);
    try {
      await signInAs(role);
    } catch (e) {
      Alert.alert("Demo Login Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppText variant="h1">Welcome Back</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Sign in to your account
        </AppText>
      </View>

      <View style={styles.form}>
        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
        </View>

        <AppButton
          title="Sign In"
          fullWidth
          style={styles.signInBtn}
          loading={isLoading}
          onPress={handleLogin}
        />
      </View>

      <View style={styles.demoSection}>
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <AppText
            variant="bodySmall"
            color={theme.colors.textSecondary}
            style={styles.dividerText}
          >
            DEMO LOGIN (ROLE SELECT)
          </AppText>
          <View style={styles.divider} />
        </View>

        {(["resident", "driver", "admin"] as Role[]).map((role) => (
          <AppButton
            key={role}
            title={`Login as ${role === 'driver' ? 'collector' : role}`}
            variant="outline"
            fullWidth
            style={styles.demoBtn}
            loading={isLoading}
            onPress={() => handleDemoLogin(role)}
            textStyle={{ textTransform: 'capitalize' }}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <AppText variant="body" color={theme.colors.textSecondary}>
          Don't have an account?{" "}
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
          <AppText variant="body" weight="600" color={theme.colors.primary}>
            Sign Up
          </AppText>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
  form: { marginBottom: theme.spacing.xl },
  signInBtn: { marginTop: theme.spacing.md },
  demoSection: { marginTop: theme.spacing.xl },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  divider: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  dividerText: { paddingHorizontal: theme.spacing.md },
  demoBtn: { marginBottom: theme.spacing.md },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
  },
});
