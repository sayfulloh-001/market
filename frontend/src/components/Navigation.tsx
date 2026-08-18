import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, User, Coins, Bell, Moon, Sun, Shield } from 'lucide-react';

interface NavigationProps {
  activeTab: 'orders' | 'profile';
  setActiveTab: (tab: 'orders' | 'profile') => void;
  coinBalance: number;
  onOpenCoinStore: () => void;
  onOpenAdmin: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  userRole?: string;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  coinBalance,
  onOpenCoinStore,
  onOpenAdmin,
  onOpenNotifications,
  unreadCount,
  userRole,
  theme,
  toggleTheme,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/30">
              D
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 dark:text-white text-lg leading-none tracking-tight">
                {t('appName')}
              </h1>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                🛍 Onlayn Do'kon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Coin Balance Badge */}
            <button
              onClick={onOpenCoinStore}
              className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xs"
            >
              <Coins className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>{coinBalance}</span>
            </button>

            {/* Notifications */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Admin link if user is admin */}
            {(userRole === 'ADMIN' || userRole === 'CHAIRMAN') && (
              <button
                onClick={onOpenAdmin}
                className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 rounded-full hover:bg-purple-100 transition-colors"
                title="Admin Panel"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Floating Menu Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-4 py-2 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-around gap-4">
          {/* Tab 1: Orders / Store */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all ${
              activeTab === 'orders'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black shadow-xs scale-102'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 font-bold'
            }`}
          >
            <ShoppingBag className={`w-6 h-6 mb-0.5 ${activeTab === 'orders' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-xs">{t('nav.orders')}</span>
          </button>

          {/* Tab 2: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all ${
              activeTab === 'profile'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black shadow-xs scale-102'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 font-bold'
            }`}
          >
            <User className={`w-6 h-6 mb-0.5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-xs">{t('nav.profile')}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
