import React, { createContext, useContext, useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { User, Role } from "../types";
import { authService, RegisterPayload } from "../services/auth";
import { parseApiError } from "../services/api";

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signInAs: (role: Role) => Promise<void>; // kept for demo login buttons
  login: (
    email: string,
    password: string,
    expoPushToken?: string,
  ) => Promise<void>;
  register: (userData: RegisterPayload) => Promise<void>;
  updateProfile: (updates: Partial<RegisterPayload>) => Promise<void>;
  signOut: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? "demo-project-id";

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
  } else {
    console.log("Must use physical device for Push Notifications");
  }

  return token;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionUser = await authService.checkSession();
        if (sessionUser) {
          setUser(sessionUser);
          setupPushToken();
        }
      } catch (error) {
        // Session invalid — user must log in
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const setupPushToken = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await authService.updatePushToken(token);
      }
    } catch (error) {
      console.log("Push token error:", error);
    }
  };

  /** Real email/password login */
  const login = async (
    email: string,
    password: string,
    expoPushToken?: string,
  ) => {
    const loggedIn = await authService.login({
      email,
      password,
      expoPushToken,
    });
    setUser(loggedIn);
    setupPushToken();
  };

  /**
   * Demo shortcut — calls login with preset test credentials.
   * Replace credentials with real seeded accounts in the DB.
   */
  const signInAs = async (role: Role) => {
    const credentials: Record<Role, { email: string; password: string }> = {
      resident: { email: "resident01@akureclean.test", password: "test1234" },
      driver: { email: "driver@example.com", password: "securepassword123" },
      admin: { email: "admin@example.com", password: "securepassword123" },
    };
    const { email, password } = credentials[role];
    await login(email, password);
  };

  const register = async (userData: RegisterPayload) => {
    const newUser = await authService.register(userData);
    setUser(newUser);
    setupPushToken();
  };

  const updateProfile = async (updates: Partial<RegisterPayload>) => {
    const updated = await authService.updateMe(updates);
    setUser(updated);
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  const deactivateAccount = async () => {
    await authService.deactivateAccount();
    await signOut();
  };

  const deleteAccount = async () => {
    await authService.deleteAccount();
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInAs,
        login,
        register,
        updateProfile,
        signOut,
        deactivateAccount,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
