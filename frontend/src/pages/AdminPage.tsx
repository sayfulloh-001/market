import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, ShoppingBag, MessageSquare, Store, Shield, Lock, Unlock, Plus, Loader2 } from 'lucide-react';
import { api } from '../api';

interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  ordersToday: number;
  totalApplications: number;
  activeStores: number;
  totalCoinsEarned: number;
}

interface AdminUserItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  isBlocked: boolean;
  coinBalance?: { balance: number };
}

interface AdminStoreItem {
  id: string;
  name: string;
  telegramId: string;
  isActive: boolean;
  orderCount: number;
}

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'stores'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New Store Form
  const [storeName, setStoreName] = useState('');
  const [storeTelegramId, setStoreTelegramId] = useState('');
  const [addingStore, setAddingStore] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await api.get('/admin/stores');
      if (res.data.success) setStores(res.data.stores);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'stores') fetchStores();

    const interval = setInterval(() => {
      fetchStats();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'stores') fetchStores();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleToggleBlock = async (userId: string) => {
    try {
      const res = await api.put(`/admin/users/${userId}/block`);
      if (res.data.success) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !storeTelegramId) return;

    setAddingStore(true);
    try {
      const res = await api.post('/admin/stores', { name: storeName, telegramId: storeTelegramId });
      if (res.data.success) {
        setStoreName('');
        setStoreTelegramId('');
        fetchStores();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingStore(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              🛡 {t('admin.title')}
            </h2>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
            activeTab === 'stats' ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          Statistika
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
            activeTab === 'users' ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.usersTab')}
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
            activeTab === 'stores' ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.storesTab')}
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-1">
            <Users className="w-6 h-6 text-brand-600 mb-1" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 font-bold">{t('admin.stats.users')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-1">
            <ShoppingBag className="w-6 h-6 text-emerald-600 mb-1" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.ordersToday}</p>
            <p className="text-xs text-gray-500 font-bold">{t('admin.stats.ordersToday')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-1">
            <MessageSquare className="w-6 h-6 text-blue-600 mb-1" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalApplications}</p>
            <p className="text-xs text-gray-500 font-bold">{t('admin.stats.apps')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-1">
            <Store className="w-6 h-6 text-purple-600 mb-1" />
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.activeStores}</p>
            <p className="text-xs text-gray-500 font-bold">{t('admin.stats.stores')}</p>
          </div>
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                  {u.firstName} {u.lastName}
                </h4>
                <p className="text-xs text-gray-400 font-mono">{u.phone}</p>
              </div>

              <button
                onClick={() => handleToggleBlock(u.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 ${
                  u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{u.isBlocked ? t('admin.unblockBtn') : t('admin.blockBtn')}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stores Management Tab */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <form onSubmit={handleAddStore} className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow space-y-3">
            <h4 className="font-extrabold text-gray-900 dark:text-white text-sm">
              ➕ Yangi Do'kon Qo'shish
            </h4>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Do'kon nomi"
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold text-sm"
              required
            />
            <input
              type="text"
              value={storeTelegramId}
              onChange={(e) => setStoreTelegramId(e.target.value)}
              placeholder="Telegram ID"
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold text-sm"
              required
            />
            <button type="submit" disabled={addingStore} className="w-full btn-large bg-brand-600 text-white font-bold">
              Qo'shish
            </button>
          </form>

          <div className="space-y-2">
            {stores.map((s) => (
              <div key={s.id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-gray-900 dark:text-white text-base">{s.name}</h4>
                  <p className="text-xs text-gray-400">Telegram ID: {s.telegramId} • {s.orderCount} ta buyurtma</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full">
                  Faol
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
