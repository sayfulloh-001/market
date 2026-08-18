# 🚀 PythonAnywhere.com da Telegram Botni 24/7 Bepul Ishga Tushirish Qo'llanmasi

Ushbu qo'llanma orqali Telegram botingizni [pythonanywhere.com](https://www.pythonanywhere.com/) ga 2 daqiqada joylashtirib, uni 24/7 o'chmasdan ishlaydigan qilib qo'yishingiz mumkin.

---

## 1-Qadam: PythonAnywhere'da ro'yxatdan o'tish
1. [pythonanywhere.com](https://www.pythonanywhere.com/) saytiga kiring va **"Pricing & signup"** -> **"Create a Beginner account"** (Bepul) tugmasini bosing.
2. Ro'yxatdan o'ting va akkauntingizga kiring.

---

## 2-Qadam: Web App yaratish (Flask)
1. PythonAnywhere boshqaruv panelida yuqoridagi **"Web"** bo'limiga o'ting.
2. **"Add a new web app"** tugmasini bosing.
3. Keyingi bosqichda:
   - Framework sifatida: **Flask** ni tanlang.
   - Python versiyasi: **Python 3.10** (yoki eng so'nggisi).
   - Fayl yo'li: `mysite/flask_app.py` holatida qoldiring va **"Next"** ni bosing.

---

## 3-Qadam: Bot kodini joylashtirish
1. Yuqoridagi menyudan **"Files"** bo'limiga o'ting.
2. `mysite/` papkasiga kiring va `flask_app.py` faylini oching.
3. Loyihangizdagi `pythonanywhere_bot.py` faylining barcha kodini nusxalab (`Ctrl+A`, `Ctrl+C`), `flask_app.py` ichiga joylashtiring (`Ctrl+V`).
4. Yuqori o'ng burchakdagi **"Save"** tugmasini bosing.

---

## 4-Qadam: Webhook'ni ulash (1 marta bosish kifoya!)
1. **"Web"** bo'limiga qaytib, yashil **"Reload <username>.pythonanywhere.com"** tugmasini bosing.
2. Brauzeringizda quyidagi manzilni oching:
   ```
   https://<username>.pythonanywhere.com/set_webhook
   ```
   *(Masalan: `https://ali.pythonanywhere.com/set_webhook`)*
3. Ekranda `"Webhook was set"` degan javob chiqadi.

---

## 🎉 Bo'ldi! Telegram botingiz 24/7 bepul ishlamoqda!
- Endi kompyuteringiz o'chiq bo'lsa ham, bot doimiy ravishda Telegramda ishlayveradi.
- Bot /start va kontaktlarni qabul qiladi.
- Buyurtmalar kelganda do'kondorga xabar, Google Maps va Telegram Location Pin'ini yuboradi.
