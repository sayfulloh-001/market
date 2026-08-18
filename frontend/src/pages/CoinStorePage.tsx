import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Coins, ShoppingBag, CheckCircle2, Loader2, Gift } from 'lucide-react';
import { api } from '../api';

interface Reward {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz: string;
  descriptionRu: string;
  descriptionEn: string;
  coinPrice: number;
  stock: number;
  image: string;
}

interface CoinStorePageProps {
  balance: number;
  onBack: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

export const CoinStorePage: React.FC<CoinStorePageProps> = ({ balance, onBack, onBalanceUpdate }) => {
  const { t, i18n } = useTranslation();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coins/rewards');
      if (res.data.success) {
        setRewards(res.data.rewards);
      }
    } catch (err) {
      console.error('Fetch rewards error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const getLocalizedName = (r: Reward) => {
    const lang = i18n.language;
    if (lang === 'ru') return r.nameRu;
    if (lang === 'en') return r.nameEn;
    return r.nameUz;
  };

  const getLocalizedDesc = (r: Reward) => {
    const lang = i18n.language;
    if (lang === 'ru') return r.descriptionRu;
    if (lang === 'en') return r.descriptionEn;
    return r.descriptionUz;
  };

  const handleRedeem = async () => {
    if (!selectedReward) return;

    setPurchasing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/coins/redeem', { rewardId: selectedReward.id });
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        onBalanceUpdate(res.data.newBalance);
        setSelectedReward(null);
        fetchRewards();
      } else {
        setError(res.data.message || 'Xaridlarda xatolik');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Coin yetarli emas yoki xatolik yuz berdi');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
              🏪 {t('coinStore.title')}
            </h2>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 fill-amber-400" />
              <span>{t('coinStore.balance')}: {balance} Coin</span>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl font-semibold text-sm">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-semibold text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-4 card-shadow border border-gray-100 dark:border-gray-700 flex flex-col justify-between space-y-3"
            >
              <div className="flex gap-3">
                <img
                  src={r.image}
                  alt={r.nameUz}
                  className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-gray-100"
                />
                <div className="space-y-1 min-w-0">
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">
                    {getLocalizedName(r)}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {getLocalizedDesc(r)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold text-lg">
                  <Coins className="w-5 h-5 fill-amber-400" />
                  <span>{r.coinPrice} Coin</span>
                </div>

                <button
                  onClick={() => setSelectedReward(r)}
                  disabled={balance < r.coinPrice}
                  className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all ${
                    balance >= r.coinPrice
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-95'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {t('coinStore.buyBtn')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
              <Gift className="w-9 h-9" />
            </div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">
              {getLocalizedName(selectedReward)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              Sizdan <span className="font-bold text-amber-600">{selectedReward.coinPrice} Coin</span> yechiladi. Davom etasizmi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedReward(null)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleRedeem}
                disabled={purchasing}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/30"
              >
                {purchasing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
