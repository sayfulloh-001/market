import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';

import { Navigation } from './components/Navigation';
import { SplashLanguagePage } from './pages/SplashLanguagePage';
import { AuthPage } from './pages/AuthPage';
import { FaceUploadPage } from './pages/FaceUploadPage';

import { ContactsPage } from './pages/ContactsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ApplicationChatPage } from './pages/ApplicationChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { CoinStorePage } from './pages/CoinStorePage';
import { AdminPage } from './pages/AdminPage';

import { api } from './api';

export const App: React.FC = () => {
  const { i18n } = useTranslation();

  // App initialization states
  const [showSplash, setShowSplash] = useState(!localStorage.getItem('mahalla_lang'));
  const [token, setToken] = useState<string | null>(localStorage.getItem('mahalla_token'));
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('mahalla_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [view, setView] = useState<'main' | 'coinStore' | 'admin'>('main');

  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('mahalla_theme') as 'light' | 'dark') || 'light'
  );

  // Sync dark class on body
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mahalla_theme', theme);
  }, [theme]);

  // Fetch current user details on mount and sync every second silently
  useEffect(() => {
    if (!token) return;

    const syncProfile = () => {
      api
        .get('/auth/profile')
        .then((res) => {
          if (res.data.success) {
            setUser((prev: any) => {
              if (!prev) {
                localStorage.setItem('mahalla_user', JSON.stringify(res.data.user));
                return res.data.user;
              }
              // Only update if relevant data changed to avoid re-render cycles
              if (
                prev.coinBalance?.balance !== res.data.user.coinBalance?.balance ||
                prev.role !== res.data.user.role ||
                prev.isBlocked !== res.data.user.isBlocked ||
                prev.firstName !== res.data.user.firstName ||
                prev.lastName !== res.data.user.lastName
              ) {
                localStorage.setItem('mahalla_user', JSON.stringify(res.data.user));
                return res.data.user;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    };

    syncProfile();
    const interval = setInterval(syncProfile, 1000);

    return () => clearInterval(interval);
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('mahalla_token', newToken);
    localStorage.setItem('mahalla_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mahalla_token');
    localStorage.removeItem('mahalla_user');
    setView('main');
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // 1. Language Selection Splash (first time or profile trigger)
  if (showSplash) {
    return (
      <SplashLanguagePage
        onSelectLanguage={(lang) => {
          setShowSplash(false);
        }}
      />
    );
  }

  // 2. Authentication Login Screen
  if (!token) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Mandatory Face Upload & Verification Screen
  if (user && !user.isFaceVerified) {
    return (
      <FaceUploadPage
        onSuccess={(updatedUser) => {
          setUser(updatedUser);
          localStorage.setItem('mahalla_user', JSON.stringify(updatedUser));
        }}
      />
    );
  }

  // 4. Main Application UI
  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setView('main');
        }}
        coinBalance={user?.coinBalance?.balance || 0}
        onOpenCoinStore={() => setView('coinStore')}
        onOpenAdmin={() => setView('admin')}
        onOpenNotifications={() => {}}
        unreadCount={0}
        userRole={user?.role}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-xl w-full mx-auto p-4 pt-4">
        {view === 'coinStore' ? (
          <CoinStorePage
            balance={user?.coinBalance?.balance || 0}
            onBack={() => setView('main')}
            onBalanceUpdate={(newBalance) => {
              setUser((prev: any) => ({
                ...prev,
                coinBalance: {
                  ...prev?.coinBalance,
                  balance: newBalance,
                },
              }));
            }}
          />
        ) : view === 'admin' ? (
          <AdminPage onBack={() => setView('main')} />
        ) : (
          <>
            {activeTab === 'orders' && <OrdersPage />}
            {activeTab === 'profile' && (
              <ProfilePage
                user={user}
                onUserUpdate={(updated) => {
                  setUser((prev: any) => {
                    const merged = { ...prev, ...updated };
                    localStorage.setItem('mahalla_user', JSON.stringify(merged));
                    return merged;
                  });
                }}
                onLogout={handleLogout}
                onOpenCoinStore={() => setView('coinStore')}
                onOpenLanguageModal={() => setShowSplash(true)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
