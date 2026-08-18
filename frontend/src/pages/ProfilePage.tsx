import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, Coins, Globe, ShieldCheck, LogOut, Gift, Edit3, Loader2 } from 'lucide-react';
import { api } from '../api';

interface ProfilePageProps {
  user: any;
  onUserUpdate: (updated: any) => void;
  onLogout: () => void;
  onOpenCoinStore: () => void;
  onOpenLanguageModal: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUserUpdate,
  onLogout,
  onOpenCoinStore,
  onOpenLanguageModal,
}) => {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName || !firstName.trim()) {
      setSaveError('Ism kiritilishi shart!');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const updatedData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    try {
      const res = await api.put('/auth/profile', updatedData);
      if (res.data && res.data.success && res.data.user) {
        onUserUpdate(res.data.user);
      } else {
        onUserUpdate({ ...user, ...updatedData });
      }
    } catch (err: any) {
      console.warn('Backend update failed, saving locally:', err);
      onUserUpdate({ ...user, ...updatedData });
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  };

  const handleClaimDaily = async () => {
    setClaimingDaily(true);
    setDailyMsg(null);
    try {
      const res = await api.post('/coins/claim-daily');
      if (res.data.success) {
        setDailyClaimed(true);
        setDailyMsg(res.data.message);
        onUserUpdate({
          ...user,
          coinBalance: {
            ...user.coinBalance,
            balance: res.data.balance,
          },
        });
      } else {
        setDailyMsg(res.data.message);
      }
    } catch (err: any) {
      setDailyMsg(err.response?.data?.message || 'Kunlik bonus allaqachon olingan');
    } finally {
      setClaimingDaily(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Info Header Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-20 bg-linear-to-r from-brand-600 to-emerald-500" />

        <div className="relative pt-6">
          {/* Avatar Face Photo */}
          <div className="relative w-24 h-24 mx-auto rounded-3xl overflow-hidden bg-white dark:bg-gray-700 ring-4 ring-white dark:ring-gray-800 shadow-xl mb-3">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Face Photo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-brand-600 text-3xl">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
            )}
            {user?.isFaceVerified && (
              <div className="absolute bottom-0 right-0 bg-brand-600 text-white rounded-tl-xl p-1" title="Yuz tasdiqlangan">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {!editingName ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 text-gray-400 hover:text-brand-600 rounded-full"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-extrabold my-1">
                <span>📍</span>
                <span>{user?.mahalla || 'Tinchlik Mahallasi'}</span>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 font-mono mt-1">
                📞 {user?.phone}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="space-y-3 max-w-xs mx-auto mt-2">
              {saveError && (
                <div className="p-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold">
                  ⚠️ {saveError}
                </div>
              )}
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ism"
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-sm text-gray-900 dark:text-white"
                required
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Familiya"
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="flex-1 py-2 text-xs font-bold bg-gray-100 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  onClick={(e) => handleSaveName(e)}
                  className="flex-1 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Saqlash'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Daily Coin Bonus Card */}
      <div className="p-5 bg-linear-to-r from-amber-500 to-amber-600 text-white rounded-3xl card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <Gift className="w-6 h-6 animate-bounce" />
            <span>Kunlik Bonus</span>
          </div>
          <span className="bg-amber-700/50 px-3 py-1 rounded-full text-xs font-black">
            +5 Coin / kun
          </span>
        </div>

        {dailyMsg && (
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold text-white">
            {dailyMsg}
          </div>
        )}

        <button
          onClick={handleClaimDaily}
          disabled={claimingDaily || dailyClaimed}
          className="w-full py-3 bg-white text-amber-800 rounded-2xl font-black text-base shadow-md hover:bg-amber-50 active:scale-98 transition-all disabled:opacity-80"
        >
          {claimingDaily ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-600" />
          ) : dailyClaimed ? (
            t('profile.dailyClaimed')
          ) : (
            t('profile.dailyBonusBtn')
          )}
        </button>
      </div>

      {/* Coin Store Link Button */}
      <button
        onClick={onOpenCoinStore}
        className="w-full p-4 bg-white dark:bg-gray-800 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-amber-400 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <Coins className="w-6 h-6 fill-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
              {t('profile.coinStoreBtn')}
            </h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
              🪙 {user?.coinBalance?.balance || 0} Coin mavjud
            </p>
          </div>
        </div>
        <span className="text-gray-400 group-hover:translate-x-1 transition-transform font-bold">
          →
        </span>
      </button>

      {/* Settings Actions List */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
        {/* Language Modal Trigger */}
        <button
          onClick={onOpenLanguageModal}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-brand-600" />
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {t('profile.language')}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase">
            {localStorage.getItem('mahalla_lang') || 'uz'} →
          </span>
        </button>

        {/* Logout Trigger */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full p-4 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left font-bold"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('profile.logout')}</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-scaleUp">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <LogOut className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">
              {t('profile.logoutModal.title')}
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl"
              >
                {t('profile.logoutModal.cancel')}
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30"
              >
                {t('profile.logoutModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
