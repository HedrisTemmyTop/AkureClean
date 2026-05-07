import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'swm.access_token';
const REFRESH_TOKEN_KEY = 'swm.refresh_token';
const USER_SESSION_KEY = '@swm_user_session';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async setAccessToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },
  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_SESSION_KEY),
    ]);
  },
  async saveUser(user: object): Promise<void> {
    return AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  },
  async getUser<T>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },
};
