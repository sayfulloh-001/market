import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../api';

interface FaceUploadPageProps {
  onSuccess: (updatedUser: any) => void;
}

export const FaceUploadPage: React.FC<FaceUploadPageProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Iltimos, avval rasm tanlang');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const res = await api.post('/auth/upload-face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        onSuccess(res.data.user);
      } else {
        setError(res.data.message || 'Rasm yuklashda xatolik');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fayl yuklashda xatolik yuz berdi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-brand-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
        <div className="mx-auto w-16 h-16 bg-brand-100 dark:bg-brand-950/60 text-brand-600 rounded-2xl flex items-center justify-center mb-3">
          <Camera className="w-9 h-9" />
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
          {t('faceUpload.title')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">
          {t('faceUpload.subtitle')}
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* Circular Face Target Preview Box */}
        <div className="relative mx-auto w-48 h-48 rounded-full border-4 border-dashed border-brand-500 overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-700 mb-6 shadow-inner">
          {previewUrl ? (
            <img src={previewUrl} alt="Face Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera className="w-12 h-12 mb-2 stroke-1" />
              <span className="text-xs font-semibold">Yuz rasmi</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="w-full btn-large bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-bold cursor-pointer border border-gray-200 dark:border-gray-600">
            <Upload className="w-5 h-5 text-brand-600" />
            <span>{t('faceUpload.uploadBtn')}</span>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {previewUrl && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full btn-large bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span>{t('faceUpload.confirmBtn')}</span>
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-6 text-left p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Muhim talablar:</span>
          </div>
          <p>• Yuz aniq ko'rinsin, juda qorong'i bo'lmasin</p>
          <p>• Rasmsiz akkaunt to'liq faollashmaydi</p>
        </div>
      </div>
    </div>
  );
};
