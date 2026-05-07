import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Animatable from "react-native-animatable";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../types";
import { AuthStackParamList } from "../../navigation/AuthStack";
import { parseApiError } from "../../services/api";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Signup">;

export const SignupScreen: React.FC = () => {
  const [name, setName] = useState("Resident One");
  const [email, setEmail] = useState("resident1@gmail.com");
  const [phone, setPhone] = useState("08000000000");
  const [password, setPassword] = useState("test1234");
  const [role, setRole] = useState<Role>("resident");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    if (role === "resident" || role === "driver") {
      navigation.navigate("SignupLocation", {
        name,
        email,
        phone,
        password,
        role,
      });
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        phone,
        password,
        role,
      });
      // The context will automatically update user state and switch navigators
    } catch (e) {
      Alert.alert("Registration Failed", parseApiError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">Create Account</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Join the Smart Waste network
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        <View style={{ marginBottom: 8, marginLeft: 4 }}>
          <AppText
            variant="caption"
            weight="600"
            color={theme.colors.textSecondary}
          >
            I AM A:
          </AppText>
        </View>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[
              styles.roleBtn,
              role === "resident" && styles.roleBtnActive,
            ]}
            onPress={() => setRole("resident")}
          >
            <AppText
              variant="body"
              weight={role === "resident" ? "600" : "400"}
              color={
                role === "resident" ? theme.colors.surface : theme.colors.text
              }
            >
              Resident
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleBtn,
              role === "driver" && styles.roleBtnActive,
            ]}
            onPress={() => setRole("driver")}
          >
            <AppText
              variant="body"
              weight={role === "driver" ? "600" : "400"}
              color={
                role === "driver" ? theme.colors.surface : theme.colors.text
              }
            >
              Driver
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleBtn,
              role === "admin" && styles.roleBtnActive,
            ]}
            onPress={() => setRole("admin")}
          >
            <AppText
              variant="body"
              weight={role === "admin" ? "600" : "400"}
              color={
                role === "admin" ? theme.colors.surface : theme.colors.text
              }
            >
              Admin
            </AppText>
          </TouchableOpacity>
        </View>

        <AppInput
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <AppInput
          label="Email Address"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false} // add this
          editable={true}
        />

        <AppInput
          label="Phone Number"
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <AppInput
          label="Password"
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        <View style={{ marginTop: theme.spacing.sm }}>
          <AppButton
            title={role === "admin" ? "Sign Up" : "Next"}
            fullWidth
            style={styles.signUpBtn}
            loading={isLoading}
            onPress={handleSignup}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <AppText variant="body" color={theme.colors.textSecondary}>
          Already have an account?{" "}
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <AppText variant="body" weight="600" color={theme.colors.primary}>
            Sign In
          </AppText>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  roleSelector: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  roleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  signUpBtn: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xxl,
  },
});
