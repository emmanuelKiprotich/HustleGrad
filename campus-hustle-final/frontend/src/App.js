// frontend/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import { SpeedInsights } from '@vercel/speed-insights/react';

import LandingPage        from './components/shared/LandingPage';
import Register           from './components/auth/Register';
import Login              from './components/auth/Login';
import ForgotPassword     from './components/auth/ForgotPassword';
import MarketplaceHome    from './components/marketplace/MarketplaceHome';
import ServiceDetails     from './components/marketplace/ServiceDetails';
import StudentDashboard   from './components/dashboard/StudentDashboard';
import AdminDashboard     from './components/admin/AdminDashboard';
import MessagingInterface from './components/messaging/MessagingInterface';
import ContactUs          from './components/shared/ContactUs';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<LandingPage />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/contact"         element={<ContactUs />} />
        <Route path="/marketplace"     element={<MarketplaceHome />} />
        <Route path="/listing/:id"     element={<ServiceDetails />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute><MessagingInterface /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SpeedInsights />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
