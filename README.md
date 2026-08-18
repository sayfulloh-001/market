# 🏛 RAQAMLI MAHALLA — Production Full-Stack Tizim

> **“Mahallangiz — raqamli makonda.”**

Raqamli Mahalla — mahalla fuqarolari uchun zamonaviy, qariyalar ham, yoshlar ham foydalana oladigan mobil ilova va web admin platformasi. Android Play Market ga va PWA formatiga to'liq tayyorlangan.

---

## 🌟 Asosiy Funksiyalar va Qoidalar

1. **Authentication (Telegram & Telefon)**:
   - Telefon raqami + Telegram Bot verification (`/start <token>`).
   - Yuz rasmi bilan majburiy profil faollashtirish.

2. **1-Menu — Kontaktlar**:
   - Mahalla bo'yicha real-time qidiruv (ism, familiya, telefon).
   - 100,000+ foydalanuvchida ham tez ishlaydigan pagination.

3. **2-Menu — Buyurtma (Store Grocery Delivery)**:
   - **Kunlik limit**: 1 telefon raqam = 1 kun = 1 ta buyurtma (`Asia/Tashkent` 00:00 nazorati).
   - Round-robin do'kon taqsimoti va failover boshqaruvi.
   - Do'konlarga Telegram bot orqali `[✅ Qabul qilish]`, `[❌ Rad etish]`, `[🚚 Yetkazib berdim]` tugmalari.
   - **+8 Coin Mukofot**: Buyurtma yetkazilganda atomic DB transaction orqali yoziladi.

4. **3-Menu — Ariza (Chairman Thread Chat)**:
   - Mahalla raisiga ariza va murojaatlar yuborish.
   - Telegram Bot va Ilova o'rtasida real-time bi-directional chat sinxronizatsiyasi.

5. **4-Menu — Profil va Coin Tizimi**:
   - Kunlik **+5 Coin** bonusini olish (Asia/Tashkent 00:00).
   - **Coin Store**: 50, 100, 200 coin evaziga mukofot va couponlar xarid qilish.
   - Tizim tilini o'zgartirish (O'zbek, Русский, English).
   - Tasdiqlash modali bilan xavfsiz logout.

---

## 📁 Loyiha Strukturasi

```
c:/Users/user/Desktop/1/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Database Modellari & Migratsiya
│   ├── src/
│   │   ├── config/              # Muhit o'zgaruvchilari
│   │   ├── controllers/         # API Biznes mantiqlari
│   │   ├── db/                  # Prisma mijoz va seed fayllari
│   │   ├── middlewares/         # JWT Auth & Upload
│   │   ├── routes/              # Express API endpointlari
│   │   ├── services/            # Telegram Bot API Engine
│   │   ├── tests/               # API Unit va Integration testlar
│   │   └── server.ts            # Server entry point
│   ├── .env                     # Bot token va maxfiy kalitlar
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/                 # Axios HTTP mijoz
    │   ├── components/          # Navigation, Modallar, Header
    │   ├── i18n/                # UZ, RU, EN lug'atlari
    │   ├── pages/               # Splash, Auth, Contacts, Orders, Applications, Profile, CoinStore, Admin
    │   ├── App.tsx
    │   └── main.tsx
    ├── capacitor.config.json    # Android Play Market sozlamalari
    ├── vite.config.ts           # PWA va dev server
    └── package.json
```

---

## 🛠 O'rnatish va Ishga Tushirish

### 1. Backend API & Telegram Botni Ishga Tushirish

```bash
cd backend
npm install
npx prisma db push
npx ts-node src/db/seed.ts
npm run dev
```

Server standard **http://localhost:5000** manzilida ishga tushadi.

### 2. Frontend (React + Vite + PWA) ni Ishga Tushirish

```bash
cd frontend
npm install
npm run dev
```

Frontend standard **http://localhost:3000** manzilida ochiladi.

---

## 🔑 Environment Variables (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=raqamli_mahalla_super_secret_jwt_key_2026_production

# Telegram Bot Token
TELEGRAM_BOT_TOKEN=8682502517:AAHMdw97lxztbMfZTWqGJBXL7pNjSsoE0OU

# Telegram Role IDs
CHAIRMAN_TELEGRAM_ID=your_chairman_telegram_id
DELIVERY_TELEGRAM_ID=your_delivery_telegram_id
STORE_1_TELEGRAM_ID=your_store_1_telegram_id
STORE_2_TELEGRAM_ID=your_store_2_telegram_id
```

---

## 📱 Android Play Market APK/AAB Build Yaratish

Loyihada Capacitor to'liq sozlangan:

1. Frontendni build qiling:
   ```bash
   cd frontend
   npm run build
   ```

2. Android loyihasini sinxronlashtiring va oching:
   ```bash
   npx cap sync android
   npx cap open android
   ```

3. Android Studio danda **Build -> Generate Signed Bundle / APK** tanlab Play Market uchun `.aab` fayl yaratishingiz mumkin.

---

## 🧪 Testlarni Bajarish

Backend testlarini ishga tushirish uchun:

```bash
cd backend
npm test
```
