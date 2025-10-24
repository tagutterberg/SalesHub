import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vessels from './pages/Vessels';
import Tankers from './pages/Tankers';
import Voyages from './pages/Voyages';
import Orders from './pages/Orders';
import SOCs from './pages/SOCs';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import EmailTemplates from './pages/EmailTemplates';
import EmailLogs from './pages/EmailLogs';
import Settings from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="vessels" element={<Vessels />} />
            <Route path="tankers" element={<Tankers />} />
            <Route path="voyages" element={<Voyages />} />
            <Route path="orders" element={<Orders />} />
            <Route path="socs" element={<SOCs />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="reports" element={<Reports />} />
            <Route path="email-templates" element={<EmailTemplates />} />
            <Route path="email-logs" element={<EmailLogs />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
