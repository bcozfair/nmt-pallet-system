import React from 'react';
import MobileInterface from './components/mobile/MobileInterface';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading, signOut, isPasswordRecovery } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-medium">
        Loading System...
      </div>
    );
  }

  // Handle Logout
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <ToastContainer />
      {isPasswordRecovery ? (
        <ResetPasswordPage />
      ) : !user ? (
        <LoginPage />
      ) : user.role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <MobileInterface
          user={user}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
