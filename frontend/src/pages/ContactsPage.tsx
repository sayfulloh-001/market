import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Phone, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';
import { api } from '../api';

interface ContactUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl?: string;
  mahalla: string;
  isFaceVerified: boolean;
}

export const ContactsPage: React.FC = () => {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchContacts = async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const res = await api.get('/contacts', {
        params: { search: query, page: pageNum, limit: 15 },
      });
      if (res.data.success) {
        setContacts(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(search, 1);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">
          📞 {t('contacts.title')}
        </h2>

        {/* Debounced Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('contacts.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 outline-hidden"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-semibold flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <span>Yuklanmoqda...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl text-center space-y-2 card-shadow">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-700 dark:text-gray-200 text-lg">
            {t('contacts.empty')}
          </h3>
          <p className="text-xs text-gray-400">Boshqa so'z bilan qidirib ko'ring</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:border-brand-300 transition-all"
            >
              {/* Face Photo Avatar */}
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 shrink-0">
                {c.photoUrl ? (
                  <img src={c.photoUrl} alt={c.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-brand-600 text-xl">
                    {c.firstName.charAt(0)}
                  </div>
                )}
                {c.isFaceVerified && (
                  <div className="absolute bottom-0 right-0 bg-brand-600 text-white rounded-tl-lg p-0.5" title="Tasdiqlangan foydalanuvchi">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base truncate">
                  {c.firstName} {c.lastName}
                </h3>
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">
                  📍 {c.mahalla}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{c.phone}</span>
                </div>
              </div>

              {/* Call button */}
              <a
                href={`tel:${c.phone}`}
                className="w-11 h-11 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-800 shadow-xs"
                title="Qo'ng'iroq qilish"
              >
                <Phone className="w-5 h-5 fill-current" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
