import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2, Layers, Globe } from 'lucide-react';

// Fix Leaflet's default icon path in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface InteractiveMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ lat, lng, onLocationChange }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite'); // Default to Satellite (Sputnik)
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Function to get tile layer based on mapType
  const createTileLayer = (type: 'satellite' | 'street') => {
    if (type === 'satellite') {
      // Google Hybrid Satellite (Satellite imagery + road & street labels)
      return L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps / Satellite',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      });
    } else {
      // Standard OpenStreetMap
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
      });

      const tileLayer = createTileLayer(mapType).addTo(map);
      currentTileLayerRef.current = tileLayer;

      const marker = L.marker([lat, lng], {
        draggable: true,
      }).addTo(map);

      marker.bindPopup("<b>🛰 Sizning joylashuvingiz</b><br>Markerni to'g'ri uyingiz / tomingiz ustiga suring.").openPopup();

      marker.on('dragend', (e) => {
        const markerPos = e.target.getLatLng();
        onLocationChange(markerPos.lat, markerPos.lng);
      });

      map.on('click', (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        marker.openPopup();
        onLocationChange(clickLat, clickLng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      const map = mapInstanceRef.current;
      const marker = markerInstanceRef.current;
      if (map && marker) {
        const currentPos = marker.getLatLng();
        if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
          marker.setLatLng([lat, lng]);
          map.setView([lat, lng], map.getZoom() < 15 ? 17 : map.getZoom(), { animate: true });
        }
      }
    }
  }, [lat, lng, onLocationChange]);

  // Handle Map Type change (Satellite vs Street)
  const toggleMapType = (newType: 'satellite' | 'street') => {
    setMapType(newType);
    if (mapInstanceRef.current) {
      if (currentTileLayerRef.current) {
        mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
      }
      const newLayer = createTileLayer(newType).addTo(mapInstanceRef.current);
      currentTileLayerRef.current = newLayer;
    }
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + " Uzbekistan")}&format=json&limit=1&accept-language=uz`
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const targetLat = parseFloat(data[0].lat);
        const targetLng = parseFloat(data[0].lon);
        onLocationChange(targetLat, targetLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([targetLat, targetLng], 17, { animate: true });
        }
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([targetLat, targetLng]).openPopup();
        }
      } else {
        alert("Joylashuv topilmadi. Xaritada markerni o'zingiz surib belgilashingiz mumkin.");
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {/* Map Controls: Search Bar & Satellite Mode Switcher */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchLocation} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ko'cha yoki mo'ljal qidirish..."
              className="w-full py-2 pl-8 pr-3 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 shadow-sm"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Qidirish'}
          </button>
        </form>

        {/* Map Type Switcher */}
        <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleMapType('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
              mapType === 'satellite'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🛰 Sputnik</span>
          </button>
          <button
            type="button"
            onClick={() => toggleMapType('street')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
              mapType === 'street'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🗺 Sxema</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-72 rounded-2xl overflow-hidden border-2 border-emerald-400 dark:border-emerald-600 shadow-md z-0"
        style={{ minHeight: '280px' }}
      />

      <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-extrabold px-1">
        <span>🛰 Sputnik rejimida uylar va tomlar aniq ko'rinadi</span>
        <span className="font-mono">GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
      </div>
    </div>
  );
};
