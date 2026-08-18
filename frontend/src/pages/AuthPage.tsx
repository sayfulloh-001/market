import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Send, Loader2, ShieldCheck, ExternalLink, KeyRound, ArrowLeft } from 'lucide-react';
import { api } from '../api';

interface AuthPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('+998');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputCode, setInputCode] = useState('');
  const [authData, setAuthData] = useState<{
    telegramAuthToken: string;
    botLink: string;
    debugCode?: string;
  } | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 12) {
      setError('Iltimos, to\'liq telefon raqamingizni kiriting');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/request-telegram', { phone });
      if (res.data.success) {
        setAuthData({
          telegramAuthToken: res.data.telegramAuthToken,
          botLink: res.data.botLink,
          debugCode: res.data.debugCode,
        });
        setStep('code');
      } else {
        setError(res.data.message || 'Xatolik yuz berdi');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode || inputCode.length < 4) {
      setError('Iltimos, Telegram botga kelgan 6 xonali tasdiqlash kodini kiriting');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await api.post('/auth/verify-code', {
        phone,
        telegramAuthToken: authData?.telegramAuthToken,
        code: inputCode,
      });

      if (res.data.success && res.data.token) {
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        setError(res.data.message || 'Noto\'g\'ri kod kiritildi!');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || '❌ Noto\'g\'ri kod kiritildi! Iltimos, Telegram botga kelgan kodni tekshirib qayta kiriting.'
      );
    } finally {
      setVerifying(false);
    }
  };

  // Also auto-poll status in background in case user clicks Telegram link
  useEffect(() => {
    if (step !== 'code' || !authData) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get('/auth/check-status', {
          params: { telegramAuthToken: authData.telegramAuthToken, phone },
        });

        if (res.data.success && res.data.isVerified) {
          clearInterval(interval);
          onLoginSuccess(res.data.token, res.data.user);
        }
      } catch (err) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [step, authData, phone, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-brand-100 dark:bg-brand-950/60 text-brand-600 rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {t('login.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {step === 'phone'
              ? 'Telefon raqamingizni kiriting'
              : 'Telegram botga kelgan 6 xonali SMS kodni kiriting'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm font-bold shadow-xs">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                {t('login.phoneLabel')}
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('login.placeholder')}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-brand-500 outline-hidden"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-large bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30 font-bold"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{t('continue')}</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Link to open Telegram Bot */}
            <a
              href={authData?.botLink || 'https://t.me/Raqamli_mahallam_bot'}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
            >
              <span>🤖 Telegram Botni Ochish (@Raqamli_mahallam_bot)</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-extrabold text-gray-400 bg-white dark:bg-gray-800 px-2">
                yoki kodni kiriting
              </div>
            </div>

            {/* Code verification input form */}
            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                  6 Xonali Tasdiqlash Kodi (SMS / Telegram)
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-brand-600" />
                  <input
                    type="text"
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border-2 border-brand-500 rounded-2xl font-black tracking-widest text-center text-gray-900 dark:text-white text-2xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full btn-large bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30 text-lg"
              >
                {verifying ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <span>Kodni Tasdiqlash & Kirish</span>
                )}
              </button>
            </form>

            <button
              onClick={() => setStep('phone')}
              className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Telefon raqamni qayta kiritish</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
