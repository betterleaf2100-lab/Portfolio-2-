import React, { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink
} from "firebase/auth";
import { auth } from '../services/firebase';
import { Loader2, Mail, ShieldCheck, PieChart, TrendingUp, Globe, Leaf } from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface LoginPageProps {
  errorMsg?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ errorMsg }) => {
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      handleEmailLinkSignIn();
    }
  }, []);

  const handleEmailLinkSignIn = async () => {
    setLoading(true);
    let emailForSignIn = window.localStorage.getItem('emailForSignIn');
    
    if (!emailForSignIn) {
      emailForSignIn = window.prompt(t('promptEmail'));
    }

    if (emailForSignIn) {
      try {
        await signInWithEmailLink(auth, emailForSignIn, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
      } catch (error: any) {
        setLoading(false);
        setLocalError(t('invalidLink'));
        console.error(error);
      }
    } else {
      setLoading(false);
      setLocalError(t('noEmail'));
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setLoading(false);
      setLocalError(t('loginFailed') + ": " + error.message);
    }
  };

  const handleEmailLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setLocalError(null);

    const actionCodeSettings = {
      url: window.location.origin,
      handleCodeInApp: true
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      setLocalError(t('sendFailed') + ": " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-mono animate-pulse">{t('verifying')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 relative z-10 items-center">
        
        {/* Left Side: Features & Branding */}
        <div className="space-y-6 md:space-y-8 p-2 md:p-4 lg:p-0">
           <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit mb-4">
              {(['zh-TW', 'zh-CN', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    language === lang ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {lang === 'zh-TW' ? '繁' : lang === 'zh-CN' ? '簡' : 'EN'}
                </button>
              ))}
           </div>
           <div className="space-y-3 md:space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                  {t('loginTitle')}
                </h1>
              </div>
              <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                {t('loginSubtitle')}
              </p>
           </div>

           <div className="space-y-4 md:space-y-5">
              <h3 className="text-xs md:text-sm font-bold text-indigo-400 uppercase tracking-widest border-b border-indigo-500/30 pb-2 inline-block">
                {t('features')}
              </h3>
              <ul className="space-y-3 md:space-y-4">
                 <li className="flex gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400">
                      <PieChart size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base text-white font-bold">{t('feature1Title')}</h4>
                      <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">{t('feature1Desc')}</p>
                    </div>
                 </li>
                 <li className="flex gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
                      <Leaf size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base text-white font-bold">{t('feature2Title')}</h4>
                      <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">{t('feature2Desc')}</p>
                    </div>
                 </li>
                 <li className="flex gap-3 md:gap-4">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base text-white font-bold">{t('feature3Title')}</h4>
                      <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">{t('feature3Desc')}</p>
                    </div>
                 </li>
              </ul>
           </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col">
          <div className="mb-6 md:mb-8 flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-xl shadow-lg border border-slate-800 flex items-center justify-center text-emerald-600">
              <Leaf size={32} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">{t('appTitle')}</h2>
              <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1">{t('loginPrompt')}</p>
            </div>
          </div>

          {(localError || errorMsg) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <ShieldCheck className="text-red-400 shrink-0 w-5 h-5" />
              <p className="text-sm text-red-300">{localError || errorMsg}</p>
            </div>
          )}

          {linkSent ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center animate-fade-in">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 text-xl">✓</div>
              <h3 className="text-emerald-400 font-bold mb-2">{t('loginLinkSent')}</h3>
              <p className="text-slate-400 text-sm mb-4">{t('checkEmail', { email })}</p>
              <p className="text-slate-500 text-xs mb-4">{t('spamNotice')}</p>
              <button 
                onClick={() => setLinkSent(false)}
                className="text-xs text-slate-500 hover:text-white underline"
              >
                {t('reEnterEmail')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('loginGoogle')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">{t('nonGmail')}</span>
                </div>
              </div>

              <form onSubmit={handleEmailLinkLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('enterEmail')}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                >
                  {t('sendLink')}
                </button>
              </form>
            </div>
          )}

          {/* Footer Links for Branding Verification */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center gap-6 text-xs text-slate-500">
             <a 
               href="https://growingbar.co/app-terms/" 
               target="_blank" 
               rel="noopener noreferrer"
               className="hover:text-slate-300 transition-colors border-b border-transparent hover:border-slate-300"
             >
               {t('termsOfService')}
             </a>
             <a 
               href="https://growingbar.co/app-privacy/" 
               target="_blank" 
               rel="noopener noreferrer"
               className="hover:text-slate-300 transition-colors border-b border-transparent hover:border-slate-300"
             >
               {t('privacyPolicy')}
             </a>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-600 relative z-10 w-full text-center">
        {t('copyright', { year: new Date().getFullYear() })}
      </p>
    </div>
  );
};
