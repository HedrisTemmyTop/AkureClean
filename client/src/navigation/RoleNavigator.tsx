import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, List, Settings, Calendar, Bell, MapPin, Inbox } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

// Shared Screens
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { EditProfileScreen } from '../screens/shared/EditProfileScreen';

// Resident Screens
import { ResidentDashboard } from '../screens/resident/ResidentDashboard';
import { ReportWasteScreen } from '../screens/resident/ReportWasteScreen';
import { MyReportsScreen } from '../screens/resident/MyReportsScreen';
import { ReportDetailsScreen } from '../screens/resident/ReportDetailsScreen';
import { PaymentScreen } from '../screens/resident/PaymentScreen';
import { WasteBillScreen } from '../screens/resident/WasteBillScreen';
import { WasteBillPaymentScreen } from '../screens/resident/WasteBillPaymentScreen';
import { TransactionDetailsScreen } from '../screens/resident/TransactionDetailsScreen';
import { NotificationsScreen } from '../screens/resident/NotificationsScreen';

import { CollectorDashboard } from '../screens/collector/CollectorDashboard';
import { CollectorAssignmentsScreen } from '../screens/collector/CollectorAssignmentsScreen';
import { RequestedPickupsScreen } from '../screens/collector/RequestedPickupsScreen';
import { CollectorRequestDetailsScreen } from '../screens/collector/CollectorRequestDetailsScreen';
import { AssignmentDetailsScreen } from '../screens/collector/AssignmentDetailsScreen';
import { RouteScreen } from '../screens/collector/RouteScreen';
import { StopDetailsScreen } from '../screens/collector/StopDetailsScreen';
import { RouteCompletionSummaryScreen } from '../screens/collector/RouteCompletionSummaryScreen';
import { CollectorNotificationsScreen } from '../screens/collector/CollectorNotificationsScreen';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { AdminAssignmentsScreen } from '../screens/admin/AdminAssignmentsScreen';
import { AdminAssignmentDetailsScreen } from '../screens/admin/AdminAssignmentDetailsScreen';
import { CreateAssignmentScreen } from '../screens/admin/CreateAssignmentScreen';

export type ResidentStackParamList = {
  ResidentTabs: undefined;
  ReportWaste: undefined;
  ReportDetails: { reportId: string };
  Payment: { reportId: string };
  WasteBillPayment: undefined;
  TransactionDetails: { billId: string };
  EditProfile: undefined;
};

export type CollectorStackParamList = {
  CollectorTabs: undefined;
  AssignmentDetails: { routeId: string };
  Route: { routeId: string };
  StopDetails: { routeId: string; stopId: string };
  RouteSummary: { routeId: string };
  EditProfile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminAssignmentDetails: { routeId: string };
  CreateAssignment: undefined;
  EditProfile: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ResidentTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Dashboard') return <Home color={color} size={size} />;
        if (route.name === 'Reports') return <List color={color} size={size} />;
        if (route.name === 'Waste Bill') return <Calendar color={color} size={size} />;
        if (route.name === 'Alerts') return <Bell color={color} size={size} />;
        if (route.name === 'Profile') return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={ResidentDashboard} />
    <Tab.Screen name="Reports" component={MyReportsScreen} />
    <Tab.Screen name="Waste Bill" component={WasteBillScreen} />
    <Tab.Screen name="Alerts" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const ResidentStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ResidentTabs" component={ResidentTabs} />
    <Stack.Screen name="ReportWaste" component={ReportWasteScreen} />
    <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="WasteBillPayment" component={WasteBillPaymentScreen} />
    <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const CollectorTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Dashboard') return <Home color={color} size={size} />;
        if (route.name === 'Assignments') return <List color={color} size={size} />;
        if (route.name === 'Requests') return <Inbox color={color} size={size} />;
        if (route.name === 'Alerts') return <Bell color={color} size={size} />;
        if (route.name === 'Profile') return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={CollectorDashboard} />
    <Tab.Screen name="Assignments" component={CollectorAssignmentsScreen} />
    <Tab.Screen name="Requests" component={RequestedPickupsScreen} />
    <Tab.Screen name="Alerts" component={CollectorNotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const CollectorStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CollectorTabs" component={CollectorTabs} />
    <Stack.Screen name="AssignmentDetails" component={AssignmentDetailsScreen} />
    <Stack.Screen name="Route" component={RouteScreen} />
    <Stack.Screen name="StopDetails" component={StopDetailsScreen} />
    <Stack.Screen name="RequestDetails" component={CollectorRequestDetailsScreen} />
    <Stack.Screen name="RouteSummary" component={RouteCompletionSummaryScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Dashboard') return <Home color={color} size={size} />;
        if (route.name === 'Assignments') return <List color={color} size={size} />;
        if (route.name === 'Profile') return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboard} />
    <Tab.Screen name="Assignments" component={AdminAssignmentsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AdminStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen name="AdminAssignmentDetails" component={AdminAssignmentDetailsScreen} />
    <Stack.Screen name="CreateAssignment" component={CreateAssignmentScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

export const RoleNavigator = () => {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'Resident':
      return <ResidentStackNav />;
    case 'Collector':
      return <CollectorStackNav />;
    case 'Admin':
      return <AdminStackNav />;
    default:
      return null;
  }
};
