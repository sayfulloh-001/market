import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { Server } from 'socket.io';

let bot: TelegramBot | null = null;
let ioInstance: Server | null = null;

export const setSocketIOInstance = (io: Server) => {
  ioInstance = io;
};

export const initTelegramBot = () => {
  if (!config.telegramBotToken || config.telegramBotToken === 'your_telegram_bot_token_here') {
    console.warn('⚠️ Telegram Bot Token is missing or default. Bot features will run in mock mode.');
    return null;
  }

  try {
    bot = new TelegramBot(config.telegramBotToken, { polling: true });
    console.log('🤖 Telegram Bot successfully initialized with active polling.');

    bot.on('polling_error', (error) => {
      // Graceful polling handler to prevent unhandled rejections
      console.log('🤖 Telegram Polling Notice:', error.message || error);
    });

    bot.on('error', (error) => {
      console.error('🤖 Telegram Bot General Error:', error.message || error);
    });

    // Command /start
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const param = match ? match[1] : null;
      const telegramId = String(msg.from?.id);
      const username = msg.from?.username || '';
      const firstName = msg.from?.first_name || '';

      if (param) {
        // Param contains authentication token from frontend web app
        const authRecord = await prisma.authVerification.findUnique({
          where: { telegramAuthToken: param },
        });

        if (authRecord) {
          // Send 6-digit SMS verification code to user's Telegram chat
          bot?.sendMessage(
            chatId,
            `🏛 *RAQAMLI MAHALLA TASDIQLASH KODI*\n\nSizning kirish kodingiz: \`${authRecord.code}\`\n\nUshbu 6 xonali kodni ilovadagi tasdiqlash maydoniga kiriting.\n\n_Eslatma: Kod 15 daqiqa davomida amal qiladi._`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }

      // Default /start response asking for contact
      bot?.sendMessage(
        chatId,
        `Assalomu alaykum, ${firstName}!\n\n🏛 *RAQAMLI MAHALLA* rasmiy botiga xush kelibsiz.\n"Mahallangiz — raqamli makonda."\n\nIlovada ro'yxatdan o'tishni yakunlash uchun pastdagi *"📱 Telefon raqamni yuborish"* tugmasini bosing:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [
              [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    });

    // Contact handler
    bot.on('contact', async (msg) => {
      const chatId = msg.chat.id;
      const contact = msg.contact;
      if (!contact) return;

      let phone = contact.phone_number;
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      const telegramId = String(msg.from?.id);
      const username = msg.from?.username || '';
      const firstName = contact.first_name || msg.from?.first_name || 'Foydalanuvchi';
      const lastName = contact.last_name || msg.from?.last_name || '';

      // Find or create user
      let user = await prisma.user.findFirst({
        where: { OR: [{ phone }, { telegramId }] },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramId,
            telegramUsername: username,
            phone,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            phone,
            firstName,
            lastName,
            telegramId,
            telegramUsername: username,
            role: 'USER',
          },
        });
        await prisma.coinBalance.create({
          data: {
            userId: user.id,
            balance: 0,
          },
        });
      }

      // Mark pending auth records for this phone
      await prisma.authVerification.updateMany({
        where: { phone },
        data: { isVerified: true },
      });

      bot?.sendMessage(
        chatId,
        `✅ *Telefon raqamingiz muvaffaqiyatli tasdiqlandi!*\n\n📞 ${phone}\n👤 ${firstName} ${lastName}\n\nEndi Raqamli Mahalla ilovasida to'liq ro'yxatdan o'tdingiz.`,
        {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true },
        }
      );
    });

    // Inline button callbacks
    bot.on('callback_query', async (query) => {
      const data = query.data;
      const chatId = query.message?.chat.id;
      const messageId = query.message?.message_id;
      if (!data || !chatId) return;

      try {
        if (data.startsWith('order_accept_')) {
          const orderId = data.replace('order_accept_', '');
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (!order) {
            bot?.answerCallbackQuery(query.id, { text: 'Buyurtma topilmadi!' });
            return;
          }

          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'ACCEPTED' },
          });

          await prisma.orderStatusHistory.create({
            data: { orderId, status: 'ACCEPTED', note: 'Do\'kon tomonidan qabul qilindi' },
          });

          // Create notification for user
          await prisma.notification.create({
            data: {
              userId: order.userId,
              title: '🛒 Buyurtmangiz qabul qilindi!',
              message: `Do'kon buyurtmangizni qabul qildi va tez orada yetkazib beradi.`,
            },
          });

          if (ioInstance) {
            ioInstance.emit(`order_update_${order.userId}`, { orderId, status: 'ACCEPTED' });
          }

          bot?.answerCallbackQuery(query.id, { text: 'Buyurtma qabul qilindi!' });
          bot?.editMessageText(
            `🛒 *BUYURTMA QABUL QILINDI* ✅\n\n👤 Mijoz: ${order.userName}\n📞 Telefon: ${order.phone}\n📝 ${order.text}\n📍 Manzil: ${order.locationAddress || 'Ko\'rsatilgan'}`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚚 Yetkazib berdim', callback_data: `order_deliver_${orderId}` }],
                ],
              },
            }
          );
        } else if (data.startsWith('order_reject_')) {
          const orderId = data.replace('order_reject_', '');
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (!order) return;

          // Attempt to assign to next active store
          const activeStores = await prisma.store.findMany({
            where: { isActive: true, id: { not: order.assignedStoreId || '' } },
            orderBy: { orderCount: 'asc' },
          });

          if (activeStores.length > 0) {
            const nextStore = activeStores[0];
            await prisma.order.update({
              where: { id: orderId },
              data: { assignedStoreId: nextStore.id },
            });
            await prisma.store.update({
              where: { id: nextStore.id },
              data: { orderCount: { increment: 1 } },
            });

            // Send notification to next store
            sendOrderToStore(nextStore.telegramId, {
              id: order.id,
              userName: order.userName,
              phone: order.phone,
              text: order.text,
              locationAddress: order.locationAddress || '',
              createdAt: order.createdAt,
            });
          } else {
            // No store available
            await prisma.order.update({
              where: { id: orderId },
              data: { status: 'REJECTED' },
            });
            await prisma.notification.create({
              data: {
                userId: order.userId,
                title: '❌ Buyurtmangiz rad etildi',
                message: `Afsuski, hozirda faol do'konlar mavjud emasligi sababli buyurtmangiz rad etildi.`,
              },
            });
          }

          bot?.answerCallbackQuery(query.id, { text: 'Buyurtma rad etildi.' });
          bot?.editMessageText(`❌ *BUYURTMA RAD ETILDI*\n\nBuyurtma keyingi do'konga yo'naltirildi.`, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
          });
        } else if (data.startsWith('order_deliver_')) {
          const orderId = data.replace('order_deliver_', '');
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true },
          });

          if (!order || order.status === 'DELIVERED') {
            bot?.answerCallbackQuery(query.id, { text: 'Buyurtma avval yetkazilgan!' });
            return;
          }

          // Atomic delivery & +8 coin reward
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: orderId },
              data: { status: 'DELIVERED', coinRewarded: true, deliveredAt: new Date() },
            });

            await tx.orderStatusHistory.create({
              data: { orderId, status: 'DELIVERED', note: 'Yetkazib berildi' },
            });

            if (!order.coinRewarded) {
              const coinBalance = await tx.coinBalance.findUnique({
                where: { userId: order.userId },
              });

              if (coinBalance) {
                await tx.coinBalance.update({
                  where: { userId: order.userId },
                  data: {
                    balance: { increment: 8 },
                    totalEarned: { increment: 8 },
                  },
                });
              } else {
                await tx.coinBalance.create({
                  data: { userId: order.userId, balance: 8, totalEarned: 8 },
                });
              }

              await tx.coinTransaction.create({
                data: {
                  userId: order.userId,
                  amount: 8,
                  type: 'ORDER_REWARD',
                  description: '🛒 Buyurtma yetkazildi bonus coin',
                  referenceId: orderId,
                },
              });

              await tx.notification.create({
                data: {
                  userId: order.userId,
                  title: '🎉 Buyurtma yetkazib berildi! (+8 Coin)',
                  message: `Buyurtmangiz yetkazildi va hisobingizga +8 Coin qo'shildi!`,
                },
              });
            }
          });

          if (ioInstance) {
            ioInstance.emit(`order_update_${order.userId}`, { orderId, status: 'DELIVERED' });
          }

          bot?.answerCallbackQuery(query.id, { text: 'Yetkazilgan deb belgilandi! +8 Coin berildi.' });
          bot?.editMessageText(
            `🚚 *BUYURTMA YETKAZIB BERILDI* 🎉\n\n👤 Mijoz: ${order.userName}\n📞 Telefon: ${order.phone}\n✨ Mijozga +8 Coin taqdim etildi!`,
            {
              chat_id: chatId,
              message_id: messageId,
              parse_mode: 'Markdown',
            }
          );
        }
      } catch (err) {
        console.error('Error handling telegram callback query:', err);
      }
    });

    // Handle Chairman reply to messages
    bot.on('message', async (msg) => {
      // Check if this is a reply to an application message sent to Chairman
      const telegramId = String(msg.from?.id);
      const isChairman =
        telegramId === (process.env.CHAIRMAN_TELEGRAM_ID || config.chairmanTelegramId) ||
        telegramId === (process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId);

      if (isChairman && msg.reply_to_message && msg.text) {
        const replyText = msg.reply_to_message.text || '';
        // Extract Application ID from message format "ID: <app_id>"
        const match = replyText.match(/ID:\s*([a-f0-9\-]+)/i);
        if (match) {
          const applicationId = match[1];
          const application = await prisma.application.findUnique({
            where: { id: applicationId },
          });

          if (application) {
            const newMsg = await prisma.applicationMessage.create({
              data: {
                applicationId,
                senderRole: 'CHAIRMAN',
                senderName: 'Mahalla Raisi',
                content: msg.text,
                telegramMessageId: String(msg.message_id),
              },
            });

            await prisma.application.update({
              where: { id: applicationId },
              data: { status: 'IN_PROGRESS' },
            });

            await prisma.notification.create({
              data: {
                userId: application.userId,
                title: '🏛 Raisdan yangi javob!',
                message: `Arizangiz bo'yicha mahalla raisidan yangi xabar keldi.`,
              },
            });

            if (ioInstance) {
              ioInstance.emit(`application_msg_${applicationId}`, newMsg);
            }

            bot?.sendMessage(msg.chat.id, `✅ Javobingiz muvaffaqiyatli foydalanuvchiga yuborildi.`);
          }
        }
      }
    });

  } catch (err) {
    console.error('Failed to initialize Telegram Bot:', err);
  }

  return bot;
};

export const getTelegramBot = () => bot;

// Helper function to send order to store
export const sendOrderToStore = async (
  storeTelegramId: string,
  orderData: {
    id: string;
    userName: string;
    phone: string;
    text: string;
    locationAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    createdAt: Date;
  }
) => {
  if (!bot || !storeTelegramId) return false;
  try {
    const timeStr = new Date(orderData.createdAt).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    });

    let mapsUrl = '';
    if (orderData.latitude && orderData.longitude) {
      mapsUrl = `\n\n🗺 *Google Xarita:* https://maps.google.com/?q=${orderData.latitude},${orderData.longitude}\n📍 *Yandex Xarita:* https://yandex.com/maps/?pt=${orderData.longitude},${orderData.latitude}&z=17&l=map`;
    }

    const msgText = `🛒 *YANGI BUYURTMA*\n\n👤 *Mijoz:* ${orderData.userName}\n📞 *Telefon:* ${orderData.phone}\n📍 *Mijoz turgan joyi:* ${orderData.locationAddress || 'Joylashuv xaritada ko\'rsatilgan'}${mapsUrl}\n📝 *Buyurtma:* ${orderData.text}\n🕐 *Vaqt:* ${timeStr}\n\nID: \`${orderData.id}\``;

    await bot.sendMessage(storeTelegramId, msgText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Qabul qilish', callback_data: `order_accept_${orderData.id}` },
            { text: '❌ Rad etish', callback_data: `order_reject_${orderData.id}` },
          ],
        ],
      },
    });

    // Send native Telegram interactive Location Pin
    if (orderData.latitude && orderData.longitude) {
      try {
        await bot.sendLocation(storeTelegramId, orderData.latitude, orderData.longitude);
        console.log(`📍 Sent Telegram location pin (${orderData.latitude}, ${orderData.longitude}) to store ${storeTelegramId}`);
      } catch (locErr) {
        console.error('Failed to send Telegram location pin:', locErr);
      }
    }

    return true;
  } catch (err) {
    console.error(`Failed to send order to store ${storeTelegramId}:`, err);
    return false;
  }
};

// Helper function to send application to chairman
export const sendApplicationToChairman = async (applicationData: {
  id: string;
  userName: string;
  phone: string;
  title: string;
  createdAt: Date;
}) => {
  const chairmanId = (process.env.CHAIRMAN_TELEGRAM_ID || config.chairmanTelegramId || '').trim();

  if (!bot || !chairmanId || chairmanId === '123456789' || chairmanId === 'your_chairman_telegram_id') {
    console.warn(`⚠️ Chairman Telegram ID (${chairmanId}) is invalid or placeholder. Update CHAIRMAN_TELEGRAM_ID in .env.`);
    return false;
  }

  try {
    const timeStr = new Date(applicationData.createdAt).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    });

    const msgText = `🏛 *YANGI ARIZA*\n\n👤 *Foydalanuvchi:* ${applicationData.userName}\n📞 *Telefon:* ${applicationData.phone}\n📝 *Ariza:* ${applicationData.title}\n🕐 *Vaqt:* ${timeStr}\n\nID: \`${applicationData.id}\`\n\n💬 *Javob berish uchun ushbu xabarga Telegram'da "Reply" qiling.*`;

    await bot.sendMessage(chairmanId, msgText, {
      parse_mode: 'Markdown',
    });
    console.log(`✅ Application ${applicationData.id} successfully sent to Chairman Telegram ID ${chairmanId}`);
    return true;
  } catch (err: any) {
    console.error(`Failed to send application to chairman Telegram ID (${chairmanId}):`, err?.message || err);
    return false;
  }
};
