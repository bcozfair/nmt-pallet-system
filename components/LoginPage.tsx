import React, { useState, useEffect } from 'react';
import { signIn, resetPassword, getActiveAdmins, constructAliasEmail } from '../services/authService';
import { User as UserIcon, Lock, ArrowRight, ShieldCheck, CheckSquare, KeyRound, ChevronLeft, Mail, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'forgot_password';

const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState(''); // Email or Employee ID
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [admins, setAdmins] = useState<{ employee_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('nmt_remember_id');
    const savedPass = localStorage.getItem('nmt_remember_pass');
    if (savedId && savedPass) {
      setIdentifier(savedId);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  // Clear errors when switching modes
  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [authMode]);

  // Load admins when entering forgot password mode
  useEffect(() => {
    if (authMode === 'forgot_password') {
      getActiveAdmins()
        .then(data => {
          setAdmins(data);
          // Set default only if identifier is empty or not in list
          if (data.length > 0 && !identifier) {
            setIdentifier(data[0].employee_id);
          }
        })
        .catch(err => {
          console.error("Failed to load admins", err);
          setError("Failed to load admin list. Please check network connection.");
        });
    }
  }, [authMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'forgot_password') {
        // Forgot Password
        await resetPassword(identifier);
        const fullEmail = identifier.includes('@') ? identifier : await constructAliasEmail(identifier);
        // Display clean email (remove +tag)
        const displayEmail = fullEmail.replace(/\+.*@/, '@');
        setSuccessMsg(`Password reset instructions have been sent to ${displayEmail}.`);
      }
      else {
        // Login
        await signIn(identifier, password);

        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('nmt_remember_id', identifier);
          localStorage.setItem('nmt_remember_pass', password);
        } else {
          localStorage.removeItem('nmt_remember_id');
          localStorage.removeItem('nmt_remember_pass');
        }

        // App.tsx listener will handle redirection
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Operation failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => {
    switch (authMode) {
      case 'forgot_password':
        return { title: "Password Recovery", subtitle: "Enter your ID to reset access" };
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
                {authMode === 'forgot_password' ? "Select Admin Account" : "Email or Employee ID"}
              </label>
              <div className="relative">
                {authMode === 'forgot_password' ? (
                  <>
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    <select
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white text-gray-900 appearance-none cursor-pointer"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    >
                      <option value="" disabled>Select Admin Account</option>
                      {admins.map(admin => (
                        <option key={admin.employee_id} value={admin.employee_id}>
                          {admin.full_name} ({admin.employee_id})
                        </option>
                      ))}
                    </select>
                    {/* Add custom arrow if needed, but keeping it simple for now */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ChevronLeft className="rotate-[-90deg]" size={16} />
                    </div>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white text-gray-900"
                      placeholder="admin@nmt.com or EMP001"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </>
                )}
              </div>
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