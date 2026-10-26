import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/Tasks/TaskList';
import TaskDetails from './pages/Tasks/TaskDetails';
import CreateTask from './pages/Tasks/CreateTask';
import PickupsList from './pages/Pickups/PickupsList';
import CollectorsList from './pages/Collectors/CollectorsList';
import ResidentsList from './pages/Residents/ResidentsList';
import PaymentsList from './pages/Payments/PaymentsList';
import UsersList from './pages/Users/UsersList';
import LogsList from './pages/Logs/LogsList';
import Profile from './pages/Profile';
import LiveTracking from './pages/Tracking/LiveTracking';
import DriverAvailabilityList from './pages/Availability/DriverAvailabilityList';
import LocationsManagement from './pages/Locations/LocationsManagement';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/create" element={<CreateTask />} />
          <Route path="/tasks/:id" element={<TaskDetails />} />
          <Route path="/availability" element={<DriverAvailabilityList />} />
          <Route path="/tracking" element={<LiveTracking />} />
          <Route path="/pickups" element={<PickupsList />} />
          <Route path="/locations" element={<LocationsManagement />} />
          <Route path="/collectors" element={<CollectorsList />} />
          <Route path="/residents" element={<ResidentsList />} />
          <Route path="/payments" element={<PaymentsList />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/logs" element={<LogsList />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
