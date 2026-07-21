import React, { useState } from 'react';
import { updateUserPassword, signOut } from '../services/authService';
import { Lock, KeyRound, CheckSquare, Eye, EyeOff } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { useT } from '../hooks/useT';

const ResetPasswordPage: React.FC = () => {
    const t = useT();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError(t.resetPassword.passwordsDoNotMatch);
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError(t.resetPassword.tooShort);
            setLoading(false);
            return;
        }

        try {
            await updateUserPassword(password);
            setSuccess(true);
            // Optional: Sign out to force re-login with new password, or just redirect
            setTimeout(async () => {
                await signOut();
                window.location.href = '/'; // Reload to clear recovery hash and state
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setError(t.resetPassword.updateFailed);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckSquare className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.resetPassword.successTitle}</h2>
                    <p className="text-gray-600 mb-6">
                        {t.resetPassword.successBody}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="relative bg-indigo-600 p-8 pt-14 text-center">
                    {/* Reached from an emailed link, so this is also a pre-auth
                        screen and needs its own way to switch language. */}
                    <div className="absolute top-4 right-4">
                        <LanguageToggle />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{t.resetPassword.title}</h1>
                    <p className="text-indigo-100">
                        {t.resetPassword.subtitle}
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.resetPassword.newPassword}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.resetPassword.confirmPassword}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword && (
                                <p className={`text-xs mt-1 font-medium ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                    {password === confirmPassword ? t.resetPassword.passwordsMatch : t.resetPassword.passwordsDoNotMatch}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? t.resetPassword.updating : <>{t.resetPassword.submit} <KeyRound size={20} /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
