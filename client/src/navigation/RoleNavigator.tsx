import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Home,
  List,
  Settings,
  Calendar,
  Bell,
  MapPin,
  Inbox,
} from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";

// Shared Screens
import { ProfileScreen } from "../screens/shared/ProfileScreen";
import { EditProfileScreen } from "../screens/shared/EditProfileScreen";

// Resident Screens
import { ResidentDashboard } from "../screens/resident/ResidentDashboard";
import { RequestPickupScreen } from "../screens/resident/ReportWasteScreen";
import { MyPickupsScreen } from "../screens/resident/MyReportsScreen";
import { PickupDetailsScreen } from "../screens/resident/ReportDetailsScreen";
import { PaymentScreen } from "../screens/resident/PaymentScreen";
import { WasteBillScreen } from "../screens/resident/WasteBillScreen";
import { WasteBillPaymentScreen } from "../screens/resident/WasteBillPaymentScreen";
import { TransactionDetailsScreen } from "../screens/resident/TransactionDetailsScreen";
import { NotificationsScreen } from "../screens/resident/NotificationsScreen";
import { PaystackCheckoutScreen } from "../screens/resident/PaystackCheckoutScreen";

// Driver Screens
import { DriverDashboard } from "../screens/driver/DriverDashboard";
import { DriverAssignmentsScreen } from "../screens/driver/DriverAssignmentsScreen";
import { RequestedPickupsScreen } from "../screens/driver/RequestedPickupsScreen";
import { DriverRequestDetailsScreen } from "../screens/driver/DriverRequestDetailsScreen";
import { AssignmentDetailsScreen } from "../screens/driver/AssignmentDetailsScreen";
import { RouteScreen } from "../screens/driver/RouteScreen";
import { StopDetailsScreen } from "../screens/driver/StopDetailsScreen";
import { RouteCompletionSummaryScreen } from "../screens/driver/RouteCompletionSummaryScreen";
import { DriverNotificationsScreen } from "../screens/driver/DriverNotificationsScreen";
import { AdminDashboard } from "../screens/admin/AdminDashboard";
import { AdminAssignmentsScreen } from "../screens/admin/AdminAssignmentsScreen";
import { AdminAssignmentDetailsScreen } from "../screens/admin/AdminAssignmentDetailsScreen";
import { AdminStopDetailsScreen } from "../screens/admin/AdminStopDetailsScreen";
import { CreateAssignmentScreen } from "../screens/admin/CreateAssignmentScreen";
import { CreateZoneScreen } from "../screens/admin/CreateZoneScreen";
import { AdminZonesScreen } from "../screens/admin/AdminZonesScreen";
import { AdminUsersScreen } from "../screens/admin/AdminUsersScreen";
import { AdminLogsScreen } from "../screens/admin/AdminLogsScreen";
import { AdminCollectorsScreen } from "../screens/admin/AdminCollectorsScreen";
import { AdminCollectorDetailsScreen } from "../screens/admin/AdminCollectorDetailsScreen";
import { AdminPickupsScreen } from "../screens/admin/AdminPickupsScreen";
import { AdminPickupDetailsScreen } from "../screens/admin/AdminPickupDetailsScreen";
import { AdminLogDetailsScreen } from "../screens/admin/AdminLogDetailsScreen";
import { AdminResidentsScreen } from "../screens/admin/AdminResidentsScreen";
import { AdminResidentDetailsScreen } from "../screens/admin/AdminResidentDetailsScreen";
import { AdminPaymentsScreen } from "../screens/admin/AdminPaymentsScreen";
import { AdminPaymentDetailsScreen } from "../screens/admin/AdminPaymentDetailsScreen";

export type ResidentStackParamList = {
  ResidentTabs: undefined;
  RequestPickup: undefined;
  PickupDetails: { reportId: string };
  Payment: { reportId: string };
  PaystackCheckout: {
    amount: number;
    metadata: any;
    onSuccess: () => void;
    onCancel: () => void;
  };
  WasteBillPayment: undefined;
  TransactionDetails: { billId: string };
  EditProfile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  AssignmentDetails: { routeId: string };
  Route: { routeId: string };
  StopDetails: { routeId: string; stopId: string };
  RequestDetails: { requestId: string };
  RouteSummary: { routeId: string };
  EditProfile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AdminAssignmentDetails: { routeId: string };
  CreateAssignment: undefined;
  CreateZone: undefined;
  ZonesList: undefined;
  UsersList: undefined;
  LogsList: undefined;
  AdminLogDetails: { logData: any };
  AdminResidentsList: undefined;
  AdminResidentDetails: { residentId: string };
  AdminPaymentsList: undefined;
  AdminPaymentDetails: { paymentData: any };
  AdminCollectorsList: undefined;
  AdminCollectorDetails: { driverId: string };
  AdminPickupsList: undefined;
  AdminPickupDetails: { pickupId: string };
  AdminStopDetails: { routeId: string; stopId: string };
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
        if (route.name === "Dashboard")
          return <Home color={color} size={size} />;
        if (route.name === "Pickups") return <List color={color} size={size} />;
        if (route.name === "Waste Bill")
          return <Calendar color={color} size={size} />;
        if (route.name === "Alerts") return <Bell color={color} size={size} />;
        if (route.name === "Profile")
          return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={ResidentDashboard} />
    <Tab.Screen name="Pickups" component={MyPickupsScreen} />
    <Tab.Screen name="Waste Bill" component={WasteBillScreen} />
    <Tab.Screen name="Alerts" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const ResidentStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ResidentTabs" component={ResidentTabs} />
    <Stack.Screen name="RequestPickup" component={RequestPickupScreen} />
    <Stack.Screen name="PickupDetails" component={PickupDetailsScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
    <Stack.Screen name="PaystackCheckout" component={PaystackCheckoutScreen} />
    <Stack.Screen name="WasteBillPayment" component={WasteBillPaymentScreen} />
    <Stack.Screen
      name="TransactionDetails"
      component={TransactionDetailsScreen}
    />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const DriverTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarIcon: ({ color, size }) => {
        if (route.name === "Dashboard")
          return <Home color={color} size={size} />;
        if (route.name === "Tasks") return <List color={color} size={size} />;
        if (route.name === "Pickup Requests")
          return <Inbox color={color} size={size} />;
        if (route.name === "Alerts") return <Bell color={color} size={size} />;
        if (route.name === "Profile")
          return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DriverDashboard} />
    <Tab.Screen name="Tasks" component={DriverAssignmentsScreen} />
    <Tab.Screen name="Pickup Requests" component={RequestedPickupsScreen} />
    <Tab.Screen name="Alerts" component={DriverNotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const DriverStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DriverTabs" component={DriverTabs} />
    <Stack.Screen
      name="AssignmentDetails"
      component={AssignmentDetailsScreen}
    />
    <Stack.Screen name="Route" component={RouteScreen} />
    <Stack.Screen name="StopDetails" component={StopDetailsScreen} />
    <Stack.Screen
      name="RequestDetails"
      component={DriverRequestDetailsScreen}
    />
    <Stack.Screen
      name="RouteSummary"
      component={RouteCompletionSummaryScreen}
    />
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
        if (route.name === "Dashboard")
          return <Home color={color} size={size} />;
        if (route.name === "Tasks") return <List color={color} size={size} />;
        if (route.name === "Profile")
          return <Settings color={color} size={size} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboard} />
    <Tab.Screen name="Tasks" component={AdminAssignmentsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AdminStackNav = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen
      name="AdminAssignmentDetails"
      component={AdminAssignmentDetailsScreen}
    />
    <Stack.Screen name="CreateAssignment" component={CreateAssignmentScreen} />
    <Stack.Screen name="CreateZone" component={CreateZoneScreen} />
    <Stack.Screen name="ZonesList" component={AdminZonesScreen} />
    <Stack.Screen name="UsersList" component={AdminUsersScreen} />
    <Stack.Screen name="LogsList" component={AdminLogsScreen} />
    <Stack.Screen name="AdminLogDetails" component={AdminLogDetailsScreen} />
    <Stack.Screen name="AdminResidentsList" component={AdminResidentsScreen} />
    <Stack.Screen
      name="AdminResidentDetails"
      component={AdminResidentDetailsScreen}
    />
    <Stack.Screen name="AdminPaymentsList" component={AdminPaymentsScreen} />
    <Stack.Screen
      name="AdminPaymentDetails"
      component={AdminPaymentDetailsScreen}
    />
    <Stack.Screen
      name="AdminCollectorsList"
      component={AdminCollectorsScreen}
    />
    <Stack.Screen
      name="AdminCollectorDetails"
      component={AdminCollectorDetailsScreen}
    />
    <Stack.Screen name="AdminPickupsList" component={AdminPickupsScreen} />
    <Stack.Screen
      name="AdminPickupDetails"
      component={AdminPickupDetailsScreen}
    />
    <Stack.Screen name="AdminStopDetails" component={AdminStopDetailsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

export const RoleNavigator = () => {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role.toLowerCase()) {
    case "resident":
      return <ResidentStackNav />;
    case "driver":
      return <DriverStackNav />;
    case "admin":
      return <AdminStackNav />;
    default:
      return null;
  }
};
