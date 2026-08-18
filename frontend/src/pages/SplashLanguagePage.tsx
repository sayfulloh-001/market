import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ArrowRight } from 'lucide-react';

interface SplashLanguagePageProps {
  onSelectLanguage: (lang: string) => void;
}

export const SplashLanguagePage: React.FC<SplashLanguagePageProps> = ({ onSelectLanguage }) => {
  const { i18n } = useTranslation();

  const handleSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('mahalla_lang', lang);
    onSelectLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-between p-6">
      <div className="w-full max-w-md my-auto text-center space-y-8">
        <div className="mx-auto w-24 h-24 bg-linear-to-tr from-emerald-600 to-teal-500 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-xl ring-8 ring-emerald-100 dark:ring-gray-800 animate-bounce">
          D
        </div>

        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
            DO'KONIM
          </h1>
          <p className="text-emerald-700 dark:text-emerald-400 font-bold mt-2 text-base">
            "Istalgan mahsulotingizni uyingizgacha yetkazamiz."
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 font-bold text-lg mb-2">
            <Globe className="w-6 h-6 text-brand-600" />
            <span>Tilni tanlang / Select Language / Выберите язык</span>
          </div>

          <button
            onClick={() => handleSelect('uz')}
            className="w-full btn-large bg-brand-600 hover:bg-brand-700 text-white shadow-md flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🇺🇿</span>
              <span>O'zbek tili</span>
            </span>
            <ArrowRight className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleSelect('ru')}
            className="w-full btn-large bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-900 dark:text-white shadow-sm flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🇷🇺</span>
              <span>Русский язык</span>
            </span>
            <ArrowRight className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleSelect('en')}
            className="w-full btn-large bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-900 dark:text-white shadow-sm flex items-center justify-between px-6"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🇬🇧</span>
              <span>English</span>
            </span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
        Raqamli Mahalla Platform v1.0 • Play Market Ready
      </p>
    </div>
  );
};
