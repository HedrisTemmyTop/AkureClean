import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { authService } from '../services/authService';
import { Lock, Mail, Eye, EyeOff, AlertTriangle, ShieldCheck, Sparkles, KeyRound, ArrowLeft } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  const { showSuccess, showError, showWarning } = useFeedback();

  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (isExpired) {
      showWarning('Your session expired. Please sign in again to continue.', 'Session Expired');
    }
  }, [isExpired, showWarning]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      const msg = 'Please enter both email address and password.';
      setErrorMessage(msg);
      showError(msg, 'Missing Credentials');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      showSuccess('Signed in to SmartEnv Admin Portal.', 'Authentication Successful');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to authenticate. Please check your credentials.';
      setErrorMessage(serverMsg);
      showError(serverMsg, 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage('Please enter your administrator email address.');
      return;
    }
    try {
      setLoading(true);
      const msg = await authService.forgotPassword(email.trim());
      showSuccess(msg, 'Reset Code Sent');
      setView('reset');
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send reset code.';
      setErrorMessage(serverMsg);
      showError(serverMsg, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      const msg = await authService.resetPassword(email.trim(), otp.trim(), newPassword);
      showSuccess(msg, 'Password Reset');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setView('login');
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reset password.';
      setErrorMessage(serverMsg);
      showError(serverMsg, 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-teal to-brand-green text-white shadow-xl shadow-brand-teal/20 mb-4">
            <Sparkles className="w-7 h-7 text-emerald-200" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SmartEnv
          </h1>
          <p className="text-sm text-teal-400 font-medium mt-1">
            Admin Web Portal &middot; Ondo State Waste Authority
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-slate-700/40 border border-slate-700 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-brand-teal flex-shrink-0" />
            <span>Restricted access: Only authorized administrator accounts are permitted to sign in here.</span>
          </div>

          {isExpired && !errorMessage && view === 'login' && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Session Expired</p>
                <p className="text-xs text-amber-300 mt-0.5 leading-relaxed">
                  Your administrative session has expired. Please sign in again.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-xs text-red-300 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartenv.ng"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setView('forgot');
                    }}
                    className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-brand-teal hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-teal/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in to Dashboard</span>
                )}
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Reset Admin Password</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Enter your administrator email address to receive a 6-digit OTP code.
                </p>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartenv.ng"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-teal hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-teal/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Sending OTP...' : 'Send 6-Digit Reset Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setView('login');
                }}
                className="w-full py-2.5 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Enter Reset OTP</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Enter the 6-digit code sent to <span className="text-teal-300 font-medium">{email}</span>.
                </p>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-base font-bold tracking-widest text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-teal/40 focus:border-brand-teal transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-teal hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-lg shadow-brand-teal/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setView('login');
                }}
                className="w-full py-2.5 px-4 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Residents and Waste Collectors must use the{' '}
              <span className="text-brand-green font-medium">SmartEnv Mobile App</span> to manage pickups or view driver routes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
