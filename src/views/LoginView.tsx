import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Languages,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Smartphone,
  Users,
  ArrowRight,
  Sparkles,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  HelpCircle,
  X,
} from 'lucide-react';
import { useMfi } from '../context/MfiContext';
import { translations, Language } from '../lib/i18n';
import { demoMode } from '../lib/demo';
import { TabType } from '../components/Sidebar';
import heroIllustration from '../assets/images/imara_microfinance_hero_1788957761197.jpg';

interface LoginViewProps {
  onLoginSuccess: (redirectTab: TabType) => void;
  onViewAboutDemo?: () => void;
}

interface DemoAccount {
  username: string;
  name: string;
  role: string;
  roleTitle: string;
  badgeColor: string;
  redirectsTo: string;
  description: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onViewAboutDemo }) => {
  const { login, language, setLanguage } = useMfi();
  const t = translations[language];

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'REQUEST' | 'VERIFY' | 'SUCCESS'>('REQUEST');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Keyboard caps lock detector
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const demoAccounts: DemoAccount[] = [
    {
      username: 'amina.manager',
      name: 'Amina Kimaro',
      role: 'BRANCH_MANAGER',
      roleTitle: language === 'sw' ? 'Meneja wa Tawi' : 'Branch Manager',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      redirectsTo: language === 'sw' ? 'Dashibodi Kuu' : 'Main Dashboard',
      description: language === 'sw' ? 'Uidhinishaji mikopo, ukwasi & viashiria' : 'Loan approvals, branch liquidity & KPIs',
    },
    {
      username: 'baraka.field',
      name: 'Baraka Mushi',
      role: 'FIELD_OFFICER',
      roleTitle: language === 'sw' ? 'Afisa Nyanjani' : 'Field / Credit Officer',
      badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      redirectsTo: language === 'sw' ? 'Usawazishaji Nje ya Mtandao' : 'Field Offline Sync',
      description: language === 'sw' ? 'Ukaguzi vikundi, ukusanyaji & fomu bila intaneti' : 'Solidarity groups, field collections & offline data',
    },
    {
      username: 'daudi.accountant',
      name: 'Daudi Mrema',
      role: 'ACCOUNTANT',
      roleTitle: language === 'sw' ? 'Mhasibu Mwandamizi' : 'Senior Accountant',
      badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      redirectsTo: language === 'sw' ? 'Uhasibu & Leja Kuu' : 'General Ledger Accounting',
      description: language === 'sw' ? 'Leja Kuu, vitabu vya fedha & usuluhisho wa BOT' : 'Double-entry journals, trial balance & reconciliation',
    },
    {
      username: 'neema.auditor',
      name: 'Neema Massawe',
      role: 'AUDITOR',
      roleTitle: language === 'sw' ? 'Mkaguzi wa Ndani' : 'Compliance & Internal Auditor',
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      redirectsTo: language === 'sw' ? 'Ukaguzi & Uzingatiaji' : 'Audit Trail & Prudential Compliance',
      description: language === 'sw' ? 'Mfuatano wa matukio na uzingatiaji sheria za BOT' : 'Immutable audit trail, PAR90 & compliance reports',
    },
    {
      username: 'admin',
      name: 'System Admin',
      role: 'ADMIN',
      roleTitle: language === 'sw' ? 'Msimamizi wa Mfumo' : 'System Administrator',
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      redirectsTo: language === 'sw' ? 'Dashibodi Kuu' : 'Core Dashboard',
      description: language === 'sw' ? 'Usimamizi kamili wa mfumo, watumiaji & usanidi' : 'Complete system configuration & user administration',
    },
  ];

  const handleSelectDemoUser = (account: DemoAccount) => {
    setIdentifier(account.username);
    setPassword('Imara@2025');
    setErrorMessage(null);
  };

  const handleQuickLogin = async (account: DemoAccount) => {
    setIdentifier(account.username);
    setPassword('Imara@2025');
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await login(account.username, 'Imara@2025', rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      const targetTab = (result.redirectTab as TabType) || 'dashboard';
      onLoginSuccess(targetTab);
    } else {
      setErrorMessage(result.error || t.invalidCredentials);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage(t.invalidCredentials || 'Please provide both username/email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await login(identifier.trim(), password, rememberMe);
    setIsSubmitting(false);

    if (result.success) {
      const targetTab = (result.redirectTab as TabType) || 'dashboard';
      onLoginSuccess(targetTab);
    } else {
      setErrorMessage(result.error || t.invalidCredentials);
    }
  };

  // Forgot password flow
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsForgotLoading(true);
    setForgotMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotStep('VERIFY');
        if (data.devOtp) {
          setResetToken(data.devOtp);
        }
        setForgotMessage(data.message || 'OTP sent successfully.');
      } else {
        setForgotMessage(data.error || 'Failed to request password reset.');
      }
    } catch {
      setForgotMessage('Network connection failure. Please try again.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) return;

    setIsForgotLoading(true);
    setForgotMessage(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          token: resetToken.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotStep('SUCCESS');
        setPassword(newPassword);
        setIdentifier(forgotEmail.trim());
      } else {
        setForgotMessage(data.error || 'Password reset failed.');
      }
    } catch {
      setForgotMessage('Network error. Please try again.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="imara-login">
      <section className="imara-login-story" aria-label={t.appName}>
        <img src={heroIllustration} alt="" className="imara-login-photo" />
        <div className="imara-login-brand">
          <span className="imara-mark"><Building2 size={21} /></span>
          <span>Imara Finance<small>{language === 'sw' ? 'Mfumo wa fedha' : 'Core banking platform'}</small></span>
        </div>
        <div className="imara-login-message">
          <h2>{language === 'sw' ? 'Huduma za fedha zilizo karibu na jamii.' : 'Banking built around your community.'}</h2>
          <p>{language === 'sw'
            ? 'Simamia mikopo, akiba na malipo ya wateja katika mfumo mmoja.'
            : 'Manage loans, savings and customer payments in one workspace.'}</p>
        </div>
      </section>

      <main className="imara-login-main">
        <div className="imara-login-tools">
          <button type="button" onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}>
            <Languages size={16} /> {language === 'en' ? 'Kiswahili' : 'English'}
          </button>
        </div>
        <div className="imara-login-form">
          <div className="mb-8">
            <span className="imara-section-label"><Lock size={14} />{t.secureAccessNote}</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">{t.welcomeBack}</h1>
            <p className="mt-2 text-sm text-slate-400">{t.signInPrompt}</p>
          </div>
            {/* Error Message Notification */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start space-x-2.5 animate-in fade-in slide-in-from-top-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">{language === 'sw' ? 'Kosa la Kuingia' : 'Authentication Error'}</p>
                  <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Identifier Input */}
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  {t.emailOrUsername}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={language === 'sw' ? 'mfano: amina.manager au baraka.field' : 'e.g. amina.manager or baraka.field'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium min-h-[44px]"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold text-slate-300"
                  >
                    {t.password}
                  </label>
                  {demoMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(identifier.includes('@') ? identifier : 'amina.manager@imarafinance.co.tz');
                      setForgotStep('REQUEST');
                      setForgotMessage(null);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                  >
                    {t.forgotPassword}
                  </button>
                )}
                </div>

                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyDown}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-medium min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                    title={showPassword ? 'Ficha nenosiri' : 'Onyesha nenosiri'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Caps lock indicator */}
                {capsLockActive && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{language === 'sw' ? 'Herufi kubwa zimewashwa (Caps Lock)' : 'Caps Lock is ON'}</span>
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/40 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>{t.rememberMe}</span>
                </label>

                <span className="text-[11px] text-slate-500">
                  {language === 'sw' ? 'Kipindi salama cha saa 12' : '12-hour session'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.signingIn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.signIn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          {demoMode && (
            <>
            {/* Quick Demo Access Accordion */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.demoCredentialsTitle}</span>
                  <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    Pass: Imara@2025
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs flex items-center space-x-1"
                >
                  <span>{showDemoAccounts ? (language === 'sw' ? 'Funga' : 'Hide') : (language === 'sw' ? 'Onyesha' : 'Show')}</span>
                  {showDemoAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showDemoAccounts && (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {demoAccounts.map((acc) => {
                    const isSelected = identifier === acc.username;
                    return (
                      <div
                        key={acc.username}
                        className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="truncate pr-2 cursor-pointer flex-1"
                          onClick={() => handleSelectDemoUser(acc)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white truncate">{acc.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${acc.badgeColor}`}>
                              {acc.roleTitle}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {acc.username} • <span className="text-emerald-400">→ {acc.redirectsTo}</span>
                          </p>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectDemoUser(acc)}
                            className="px-2 py-1 text-[10px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                          >
                            {language === 'sw' ? 'Weka' : 'Fill'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickLogin(acc)}
                            className="px-2.5 py-1 text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm flex items-center space-x-1"
                          >
                            <span>{language === 'sw' ? 'Ingia' : 'Login'}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

              {onViewAboutDemo && (
                <button type="button" onClick={onViewAboutDemo} className="mt-4 text-sm font-semibold text-emerald-400">
                  {t.aboutDemo}
                </button>
              )}
            </>
          )}
        </div>
      </main>

      {/* Forgot Password Dialog */}
      {demoMode && isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4 animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-label={t.forgotPassword} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-emerald-400 mb-2">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">
                {language === 'sw' ? 'Rejesha Nenosiri la Mtumishi' : 'Staff Password Recovery'}
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              {forgotStep === 'REQUEST' &&
                (language === 'sw'
                  ? 'Weka barua pepe yako ya kazi ili kupokea nambari ya uthibitisho (OTP).'
                  : 'Enter your registered staff email address to generate an OTP security token.')}
              {forgotStep === 'VERIFY' &&
                (language === 'sw'
                  ? 'Weka nambari ya OTP na nenosiri lako jipya.'
                  : 'Enter the security token and set your new institutional password.')}
              {forgotStep === 'SUCCESS' &&
                (language === 'sw'
                  ? 'Nenosiri lako limebadilishwa kikamilifu! Sasa unaweza kuingia.'
                  : 'Password updated successfully! You can now log in.')}
            </p>

            {forgotMessage && (
              <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300">
                {forgotMessage}
              </div>
            )}

            {forgotStep === 'REQUEST' && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {language === 'sw' ? 'Barua Pepe ya Mtumishi' : 'Staff Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="amina.manager@imarafinance.co.tz"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-2"
                >
                  {isForgotLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === 'sw' ? 'Tuma Nambari ya Uthibitisho' : 'Send Security OTP'}</span>
                </button>
              </form>
            )}

            {forgotStep === 'VERIFY' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {language === 'sw' ? 'Nambari ya Uthibitisho (OTP)' : 'Security OTP Token'}
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="e.g. 849201"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {language === 'sw' ? 'Nenosiri Jipya' : 'New Institutional Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-2"
                >
                  {isForgotLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === 'sw' ? 'Sasisha Nenosiri' : 'Confirm New Password'}</span>
                </button>
              </form>
            )}

            {forgotStep === 'SUCCESS' && (
              <div className="text-center py-2 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-white">
                  {language === 'sw' ? 'Nenosiri Limehifadhiwa!' : 'Password Reset Complete!'}
                </p>
                <button
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  {language === 'sw' ? 'Rudi Kwenye Fomu ya Kuingia' : 'Return to Login'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
