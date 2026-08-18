import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, MapPin, Send, AlertCircle, CheckCircle2, Clock, Truck, XCircle, Loader2, Navigation } from 'lucide-react';
import { api } from '../api';
import { io } from 'socket.io-client';
import { InteractiveMap } from '../components/InteractiveMap';

interface OrderItem {
  id: string;
  text: string;
  locationAddress: string;
  status: string;
  createdAt: string;
  assignedStore?: { name: string };
}

// Exact MFY coordinates in Buvayda tumani, Farg'ona viloyati
const MFY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Qorg'anabod MFY": { lat: 40.602098, lng: 71.202594 },
  "Xonabod MFY": { lat: 40.608418, lng: 71.198554 },
  "Boyo'yoqchi MFY": { lat: 40.605000, lng: 71.210000 },
};

const MFY_LIST = Object.keys(MFY_COORDINATES);

export const OrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [canOrderToday, setCanOrderToday] = useState(true);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Form states
  const [selectedMfy, setSelectedMfy] = useState(MFY_LIST[0]);
  const [text, setText] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [locationAddress, setLocationAddress] = useState("📍 Qo'rg'onobod, Buvayda tumani");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(MFY_COORDINATES[MFY_LIST[0]]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
        setCanOrderToday(res.data.canOrderToday);
      }
    } catch (err) {
      if (!silent) console.error('Fetch orders error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`
      );
      const data = await resp.json();
      if (data && data.display_name) {
        const address = data.address || {};
        const village = address.village || address.hamlet || address.suburb || address.town || address.city || '';
        const road = address.road || address.neighbourhood || '';
        const readable = [village, road].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
        setLocationAddress(`📍 ${readable}`);
      } else {
        setLocationAddress(`📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (e) {
      setLocationAddress(`📍 GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const handleMapLocationChange = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  const handleGetDeviceGPS = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setError(null);
          await reverseGeocode(lat, lng);
          setLocating(false);
        },
        (err) => {
          setLocating(false);
          setError("GPS aniqlanmadi. Xaritadan uyingizni belgilashingiz mumkin.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setError("Qurilmangizda GPS qo'llab-quvvatlanmaydi.");
    }
  };

  const handleSelectMfy = (mfy: string) => {
    setSelectedMfy(mfy);
    const targetCoords = MFY_COORDINATES[mfy];
    if (targetCoords) {
      setCoords(targetCoords);
      reverseGeocode(targetCoords.lat, targetCoords.lng);
    }
  };

  useEffect(() => {
    fetchOrders(false);

    // 1-second silent real-time sync (preserves all typed text and active states)
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 1000);

    const socket = io();
    socket.on('connect', () => {
      // socket connected
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Iltimos, nima mahsulotlar kerakligini yozing');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const parts = [
      `🏛 ${selectedMfy}`,
      locationAddress || `📍 GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      detailedAddress ? `🏠 Mo'ljal / Uy: ${detailedAddress}` : ''
    ].filter(Boolean);

    const fullLocation = parts.join(' | ').trim();

    try {
      const res = await api.post('/orders', {
        text,
        locationAddress: fullLocation,
        latitude: coords.lat,
        longitude: coords.lng,
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setText('');
        setDetailedAddress('');
        fetchOrders();
      } else {
        setError(res.data.message || 'Buyurtma berishda xatolik');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server xatoligi yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>Kutilmoqda</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
            <Truck className="w-3.5 h-3.5" />
            <span>Qabul qilindi</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Yetkazildi (+8 Coin)</span>
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-full text-xs font-bold border border-red-200 dark:border-red-800">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rad etildi</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Banner */}
      <div className="p-4 bg-linear-to-r from-emerald-600 to-brand-600 text-white rounded-3xl card-shadow space-y-1">
        <div className="flex items-center gap-2 font-black text-lg">
          <ShoppingBag className="w-6 h-6" />
          <span>{t('orders.title')}</span>
        </div>
        <p className="text-xs text-emerald-100 font-medium">{t('orders.limitBanner')}</p>
      </div>

      {!canOrderToday ? (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl text-amber-900 dark:text-amber-200 text-sm font-semibold flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-base text-amber-800 dark:text-amber-300">
              Bugungi limit ishlatilgan!
            </h4>
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-400">
              {t('orders.limitExceeded')}
            </p>
          </div>
        </div>
      ) : (
        /* Create Order Card */
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <span>{t('orders.newOrderBtn')}</span>
          </h3>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 rounded-2xl text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-2xl text-xs font-semibold">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 0: Village MFY Selector */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                🏘 Qishloq / MFY ni Tanlang
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MFY_LIST.map((mfy) => (
                  <button
                    key={mfy}
                    type="button"
                    onClick={() => handleSelectMfy(mfy)}
                    className={`py-2.5 px-2 rounded-2xl font-extrabold text-xs text-center transition-all ${
                      selectedMfy === mfy
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 scale-102'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {mfy}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Interactive Real Location Pin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>1. Joylashuvingizni xaritadan belgilang</span>
                </label>

                <button
                  type="button"
                  onClick={handleGetDeviceGPS}
                  disabled={locating}
                  className="text-[11px] font-extrabold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 rounded-xl"
                  title="Faqat telefon yoki GPS qurilmasida aniq ishlaydi"
                >
                  {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  <span>Qurilma GPS</span>
                </button>
              </div>

              {/* Interactive Leaflet Map with Click-to-Pin, Draggable Marker & Search */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-2.5">
                {locationAddress && (
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 font-extrabold px-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{locationAddress}</span>
                  </p>
                )}

                <InteractiveMap
                  lat={coords.lat}
                  lng={coords.lng}
                  onLocationChange={handleMapLocationChange}
                />
              </div>

              {/* Optional precise address text (Mo'ljal / Uy) */}
              <div className="pt-1">
                <label className="block text-[11px] font-extrabold text-gray-600 dark:text-gray-400 mb-1">
                  🏠 Mo'ljal, ko'cha yoki uy raqami (ixtiyoriy):
                </label>
                <input
                  type="text"
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="Masalan: 4-ko'cha, 18-uy (Bog'cha ro'parasida)"
                  className="w-full py-2.5 px-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>
            </div>

            {/* Step 2: Items Needed */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                {t('orders.step2Items')}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('orders.itemsPlaceholder')}
                rows={3}
                className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 outline-hidden resize-none"
                required
              />
            </div>

            {/* Step 3: Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-large bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30"
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{t('orders.submitOrder')}</span>
                  <Send className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Order History */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">
          📋 {t('orders.myOrders')}
        </h3>

        {orders.length === 0 ? (
          <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl text-center space-y-2 card-shadow">
            <ShoppingBag className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-bold text-gray-500">{t('orders.emptyOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 space-y-2"
              >
                <div className="flex items-center justify-between">
                  {renderStatusBadge(o.status)}
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white text-base">
                  {o.text}
                </p>
                {o.locationAddress && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{o.locationAddress}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
