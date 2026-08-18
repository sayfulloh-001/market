import { prisma } from './prisma';

async function main() {
  console.log('🌱 Initializing database...');

  // Create default stores configuration
  const store1 = await prisma.store.upsert({
    where: { telegramId: '111111111' },
    update: {},
    create: {
      name: '1-Mahalla Oziq-Ovqat Do\'koni',
      telegramId: '111111111',
      isActive: true,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { telegramId: '222222222' },
    update: {},
    create: {
      name: '2-Mahalla Fayz Minimarket',
      telegramId: '222222222',
      isActive: true,
    },
  });

  // Seed default rewards for Coin Store
  const rewardsCount = await prisma.reward.count();
  if (rewardsCount === 0) {
    await prisma.reward.createMany({
      data: [
        {
          nameUz: '5,000 so\'m Telefon Balansi',
          nameRu: '5,000 сум Баланс Телефона',
          nameEn: '5,000 UZS Phone Top-up',
          descriptionUz: 'Har qanday O\'zbekiston mobil operatoriga 5000 so\'m to\'lov',
          descriptionRu: 'Пополнение мобильного счета на 5000 сум',
          descriptionEn: 'Phone balance top-up for 5,000 UZS',
          coinPrice: 50,
          stock: 100,
          image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=300&q=80',
        },
        {
          nameUz: 'Bepul Yetkazib Berish Voucheri',
          nameRu: 'Ваучер на бесплатную доставку',
          nameEn: 'Free Delivery Voucher',
          descriptionUz: 'Mahalla do\'kontan 1 ta bepul yetkazib berish xizmati',
          descriptionRu: 'Бесплатная доставка из магазина махалли',
          descriptionEn: 'Free grocery delivery service voucher',
          coinPrice: 30,
          stock: 200,
          image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=300&q=80',
        },
        {
          nameUz: '10,000 so\'m Do\'kon Chegirmasi',
          nameRu: 'Скидка 10,000 сум в магазине',
          nameEn: '10,000 UZS Store Coupon',
          descriptionUz: 'Mahalliy do\'kondan mahsulot xaridida 10,000 so\'m chegirma',
          descriptionRu: 'Скидка 10,000 сум на покупки в местном магазине',
          descriptionEn: '10,000 UZS discount at local store',
          coinPrice: 100,
          stock: 50,
          image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300&q=80',
        },
      ],
    });
  }

  console.log('✅ Database clean initialization completed! Fake users removed.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
