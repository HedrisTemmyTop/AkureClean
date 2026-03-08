import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Role } from '../types';
import { mockUsers } from '../data/mockData';

const USER_SESSION_KEY = '@swm_user_session';

export const authService = {
  /**
   * Simulates a login by role to return a specific mock user
   */
  async mockLoginAs(role: Role): Promise<User> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const user = mockUsers.find(u => u.role === role);
    if (!user) {
      throw new Error(`No mock user found for role: ${role}`);
    }
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    return user;
  },

  /**
   * Simulates registering a new user
   */
  async mockRegister(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const newUser: User = {
      ...userData,
      id: `usr_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    // In a real app, this would be saved to a database.
    // For now, we just add it to the mock users list in memory and log them in
    mockUsers.push(newUser);
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
    return newUser;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
  },

  async checkSession(): Promise<User | null> {
    const session = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (session) {
      return JSON.parse(session) as User;
    }
    return null;
  }
};
