import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'raqamli_mahalla_super_secret_jwt_key_2026_production',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'Raqamli_mahallam_bot',
  chairmanTelegramId: process.env.CHAIRMAN_TELEGRAM_ID || '',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '',

  // All store Telegram IDs
  storeTelegramIds: Object.keys(process.env)
    .filter((key) => key.startsWith('STORE_') && key.endsWith('_TELEGRAM_ID'))
    .map((key) => process.env[key])
    .filter(Boolean) as string[],

  // Village / MFY Specific Store Mappings
  mfyStores: {
    qorganabod: Object.keys(process.env)
      .filter((k) => k.includes('QORGANABOD') && k.endsWith('_TELEGRAM_ID'))
      .map((k) => process.env[k])
      .filter(Boolean) as string[],
    xonabod: Object.keys(process.env)
      .filter((k) => k.includes('XONABOD') && k.endsWith('_TELEGRAM_ID'))
      .map((k) => process.env[k])
      .filter(Boolean) as string[],
    boyoqchi: Object.keys(process.env)
      .filter((k) => k.includes('BOYOQCHI') && k.endsWith('_TELEGRAM_ID'))
      .map((k) => process.env[k])
      .filter(Boolean) as string[],
  },
};
