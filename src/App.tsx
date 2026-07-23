import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationProvider } from '@/context/NotificationContext';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

import HomePage from '@/pages/HomePage';
import WorkersListingPage from '@/pages/WorkersListingPage';
import WorkerProfilePage from '@/pages/WorkerProfilePage';
import CategoriesPage from '@/pages/CategoriesPage';
import BookingPage from '@/pages/BookingPage';
import BookingDetailPage from '@/pages/BookingDetailPage';
import InvoicePage from '@/pages/InvoicePage';
import SupportPage from '@/pages/SupportPage';
import ProfilePage from '@/pages/ProfilePage';
import UserDashboard from '@/pages/UserDashboard';
import WorkerDashboard from '@/pages/WorkerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';

import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import WorkerRegisterPage from '@/pages/auth/WorkerRegisterPage';
import WorkerLoginPage from '@/pages/auth/WorkerLoginPage';
import AdminLoginPage from '@/pages/auth/AdminLoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <Routes>
                {/* Auth routes (no layout) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/register-worker" element={<WorkerRegisterPage />} />
                <Route path="/worker-login" element={<WorkerLoginPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Public routes (with layout) */}
                <Route path="/" element={<Layout><HomePage /></Layout>} />
                <Route path="/workers" element={<Layout><WorkersListingPage /></Layout>} />
                <Route path="/worker/:id" element={<Layout><WorkerProfilePage /></Layout>} />
                <Route path="/categories" element={<Layout><CategoriesPage /></Layout>} />
                <Route path="/support" element={<Layout><SupportPage /></Layout>} />

                {/* Protected routes */}
                <Route path="/book/:id" element={<ProtectedRoute><Layout><BookingPage /></Layout></ProtectedRoute>} />
                <Route path="/booking/:id" element={<ProtectedRoute><Layout><BookingDetailPage /></Layout></ProtectedRoute>} />
                <Route path="/invoice/:id" element={<ProtectedRoute><Layout><InvoicePage /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute roles={['user']}><Layout><UserDashboard /></Layout></ProtectedRoute>} />
                <Route path="/worker" element={<ProtectedRoute roles={['worker']}><Layout><WorkerDashboard /></Layout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
              </Routes>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
