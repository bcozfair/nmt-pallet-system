import React, { useState, useEffect } from 'react';
import { signIn, resetPassword } from '../services/authService';
import { setRemembered } from '../services/sessionPolicy';
import { Lock, ArrowRight, ShieldCheck, CheckSquare, KeyRound, ChevronLeft, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'forgot_password';

const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState(''); // Email or Employee ID
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rememberMe, setRememberMe] = useState(false);

  // Only the employee id is remembered. The password used to be persisted here
  // in plaintext so the form could be pre-filled; anything able to read
  // localStorage (any XSS, any shared device) could read the credential. The
  // session itself now persists via localStorage in services/supabase.ts, which
  // is what "remember me" actually needs.
  useEffect(() => {
    const savedId = localStorage.getItem('nmt_remember_id');
    if (savedId) {
      setIdentifier(savedId);
      setRememberMe(true);
    }
    // Clear the credential left behind by older builds.
    localStorage.removeItem('nmt_remember_pass');
  }, []);

  // Clear errors when switching modes
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [authMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'forgot_password') {
        // The response is deliberately identical whether or not the account
        // exists, and the destination mailbox is never echoed back. Supabase's
        // resetPasswordForEmail already succeeds for unknown addresses, so this
        // reveals nothing an attacker could use to enumerate employee ids.
        // (The previous screen went further and listed every admin by name.)
        await resetPassword(identifier);
        setSuccessMsg(
          "If that ID belongs to an account, a reset link has been sent to the registered administrator mailbox. Contact your administrator if you do not receive it."
        );
      }
      else {
        // Must come before signIn: the storage adapter reads this to decide
        // whether the session Supabase is about to write goes to localStorage
        // (survives a tab close) or sessionStorage (does not).
        setRemembered(rememberMe);

        // Login
        await signIn(identifier, password);

        // Remember the employee id only -- never the password.
        if (rememberMe) {
          localStorage.setItem('nmt_remember_id', identifier);
        } else {
          localStorage.removeItem('nmt_remember_id');
        }

        // App.tsx listener will handle redirection
      }
    } catch (err: any) {
      console.error(err);
      if (authMode === 'forgot_password') {
        // Do not leak *why* it failed -- "no such user" is exactly the signal
        // an enumeration attack is looking for.
        setSuccessMsg(
          "If that ID belongs to an account, a reset link has been sent to the registered administrator mailbox. Contact your administrator if you do not receive it."
        );
      } else {
        setError(err.message || "Operation failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (authMode) {
      case 'forgot_password':
        return { title: "Password Recovery", subtitle: "Enter your Employee ID or email" };
      default:
        return { title: "NMT Pallet System", subtitle: "Secure Access Portal" };
    }
  };

  const headerContent = renderHeader();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className={`p-8 text-center transition-colors duration-300 ${authMode === 'forgot_password' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
          <h1 className="text-3xl font-bold text-white mb-2">{headerContent.title}</h1>
          <p className="text-blue-100">
            {headerContent.subtitle}
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2">
                <CheckSquare size={16} /> {successMsg}
              </div>
            )}



            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Employee ID
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white text-gray-900"
                  placeholder="admin@nmt.com or EMP001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
              {authMode === 'forgot_password' && (
                <p className="mt-2 text-xs text-gray-500">
                  Reset links are delivered to the registered administrator mailbox.
                  Staff should ask an administrator to reset their password.
                </p>
              )}
            </div>

            {authMode !== 'forgot_password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white text-gray-900"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {authMode === 'login' && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${rememberMe ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'}`}>
                      {rememberMe && <CheckSquare size={14} />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-sm text-gray-600 font-medium group-hover:text-blue-600 transition">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot_password')}
                    className="text-sm text-blue-600 font-bold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Stays signed in on this device for up to 12 hours. Leave it unchecked
                  on a shared device: the session then ends as soon as you close the tab.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 ${authMode === 'forgot_password' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
            >
              {loading ? (
                "Processing..."
              ) : authMode === 'forgot_password' ? (
                <>Reset Password <KeyRound size={20} /></>
              ) : (
                <>Sign In <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-2">
            {authMode === 'login' ? (
              <p className="text-gray-600">
                Authorized access only.
              </p>
            ) : (
              <button
                onClick={() => setAuthMode('login')}
                className="flex items-center justify-center gap-2 mx-auto text-gray-500 font-bold hover:text-gray-800 transition"
              >
                <ChevronLeft size={18} /> Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;