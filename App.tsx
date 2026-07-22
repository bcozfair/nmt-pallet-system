import React from 'react';
import MobileInterface from './components/mobile/MobileInterface';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BrandMark } from './components/auth/BrandMark';
import { useT } from './hooks/useT';

// Shown while the session is being resolved and again if the profile lands
// without a usable role. Wears the same canvas as the sign-in screen, so the
// first paint after a reload is not a bare grey page that then jumps.
const BootScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="auth-canvas flex min-h-dvh flex-col items-center justify-center gap-4">
    <BrandMark className="h-8 w-auto" />
    <p className="text-sm font-medium text-slate-500">{message}</p>
  </div>
);

function AppContent() {
  const { user, loading, signOut, isPasswordRecovery } = useAuth();
  const t = useT();

  if (loading) {
    return <BootScreen message={t.app.loadingSystem} />;
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
      ) : user.role === 'staff' ? (
        <MobileInterface
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        // Any other role means the profile is not resolved yet. Defaulting to the
        // staff interface here would show admins the wrong screen on every login.
        <BootScreen message={t.app.loadingProfile} />
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
