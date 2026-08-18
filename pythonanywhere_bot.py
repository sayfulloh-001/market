#!/usr/bin/env python3
"""
🏛 DO'KONIM - TELEGRAM BOT (PythonAnywhere Versiyasi)
Bu fayl PythonAnywhere.com uchun 100% moslashtirilgan.
"""

import os
import sys
import json
from flask import Flask, request, jsonify

# Requests kutubxonasi PythonAnywhere bepul proksi bilan ideal ishlaydi
try:
    import requests
except ImportError:
    requests = None
    import urllib.request
    import urllib.parse

# ==============================================================================
# SOZLAMALAR
# ==============================================================================
BOT_TOKEN = "8682502517:AAHMdw97lxztbMfZTWqGJBXL7pNjSsoE0OU"
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
STORE_TELEGRAM_ID = "6473433651"

app = Flask(__name__)
application = app  # PythonAnywhere WSGI standarti

# ==============================================================================
# TELEGRAM API YORDAMCHI FUNKSIYALARI
# ==============================================================================
def send_telegram_request(method, data=None):
    """Telegram API ga so'rov yuborish (Requests yoki Urllib orqali)"""
    url = f"{API_URL}/{method}"
    try:
        if requests is not None:
            if data:
                res = requests.post(url, json=data, timeout=15)
            else:
                res = requests.get(url, timeout=15)
            return res.json()
        else:
            if data:
                req_data = json.dumps(data).encode("utf-8")
                req = urllib.request.Request(
                    url, data=req_data, headers={"Content-Type": "application/json"}
                )
            else:
                req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"⚠️ Telegram API xatolik ({method}): {e}")
        return {"ok": False, "error": str(e)}

def send_message(chat_id, text, reply_markup=None, parse_mode="Markdown"):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return send_telegram_request("sendMessage", payload)

def send_location(chat_id, latitude, longitude):
    """Aniq Telegram Geolocation pin yuborish"""
    try:
        payload = {
            "chat_id": chat_id,
            "latitude": float(latitude),
            "longitude": float(longitude),
        }
        return send_telegram_request("sendLocation", payload)
    except Exception as e:
        print(f"Location error: {e}")
        return None

def answer_callback_query(callback_query_id, text):
    return send_telegram_request("answerCallbackQuery", {
        "callback_query_id": callback_query_id,
        "text": text,
    })

# ==============================================================================
# TELEGRAM UPDATE HANDLER
# ==============================================================================
def process_update(update):
    """Telegramdan kelgan xabarlar va callback querylarni qayta ishlash"""
    try:
        # 1. Callback Query (Tugmalar bosilganda)
        if "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb.get("id")
            data = cb.get("data", "")
            msg = cb.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            msg_id = msg.get("message_id")

            if data.startswith("order_accept_"):
                order_id = data.replace("order_accept_", "")
                answer_callback_query(cb_id, "Buyurtma qabul qilindi! ✅")
                send_telegram_request("editMessageReplyMarkup", {
                    "chat_id": chat_id,
                    "message_id": msg_id,
                    "reply_markup": {
                        "inline_keyboard": [
                            [{"text": "🚚 Yetkazib berdim (+8 Coin)", "callback_data": f"order_deliver_{order_id}"}]
                        ]
                    }
                })

            elif data.startswith("order_reject_"):
                answer_callback_query(cb_id, "Buyurtma rad etildi ❌")
                send_telegram_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": msg_id,
                    "text": "❌ *BUYURTMA RAD ETILDI*",
                    "parse_mode": "Markdown"
                })

            elif data.startswith("order_deliver_"):
                answer_callback_query(cb_id, "Yetkazib berildi deb belgilandi! 🎉")
                send_telegram_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": msg_id,
                    "text": "🚚 *BUYURTMA YETKAZIB BERILDI* ✅\n\n✨ Mijozga +8 Coin muvaffaqiyatli taqdim etildi!",
                    "parse_mode": "Markdown"
                })
            return

        # 2. Xabarlar (Messages)
        if "message" in update:
            msg = update["message"]
            chat_id = msg["chat"]["id"]
            from_user = msg.get("from", {})
            first_name = from_user.get("first_name", "Foydalanuvchi")
            text = msg.get("text", "")
            contact = msg.get("contact")

            # Kontakt yuborilganda
            if contact:
                phone = contact.get("phone_number", "")
                if not phone.startswith("+"):
                    phone = "+" + phone

                send_message(
                    chat_id,
                    f"✅ *Telefon raqamingiz muvaffaqiyatli tasdiqlandi!*\n\n"
                    f"📞 {phone}\n"
                    f"👤 {first_name}\n\n"
                    f"Endi Do'konim ilovasiga qaytib bemalol foydalanishingiz mumkin.",
                    reply_markup={"remove_keyboard": True}
                )
                return

            # /start komandasi
            if text.startswith("/start"):
                send_message(
                    chat_id,
                    f"Assalomu alaykum, {first_name}!\n\n"
                    f"🛍 *DO'KONIM* rasmiy botiga xush kelibsiz.\n"
                    f'_"Istalgan mahsulotingizni uyingizgacha yetkazamiz."_\n\n'
                    f"Ilovada ro'yxatdan o'tishni tasdiqlash uchun pastdagi *\"📱 Telefon raqamni yuborish\"* tugmasini bosing:",
                    reply_markup={
                        "keyboard": [
                            [{"text": "📱 Telefon raqamni yuborish", "request_contact": True}]
                        ],
                        "resize_keyboard": True,
                        "one_time_keyboard": True,
                    }
                )
                return

    except Exception as e:
        print(f"Update qayta ishlashda xatolik: {e}")

# ==============================================================================
# FLASK WEBHOOK YO'NALISHLARI
# ==============================================================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "active",
        "service": "Do'konim Telegram Bot (PythonAnywhere)",
        "message": "Bot 24/7 ish holatida faol!"
    })

@app.route("/webhook", methods=["POST"])
def webhook():
    """Telegramdan keladigan barcha xabarlar shu yerga tushadi"""
    try:
        update = request.get_json(force=True, silent=True)
        if update:
            process_update(update)
    except Exception as e:
        print(f"Webhook error: {e}")
    return "OK", 200

@app.route("/api/send-order", methods=["POST"])
def api_send_order():
    """Backenddan yangi buyurtma kelganda do'konga xabar va lokatsiya yuborish"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        recipient_id = data.get("storeTelegramId") or STORE_TELEGRAM_ID
        order_id = data.get("id", "Noma'lum")
        user_name = data.get("userName", "Mijoz")
        phone = data.get("phone", "-")
        items_text = data.get("text", "")
        location_address = data.get("locationAddress", "")
        lat = data.get("latitude")
        lng = data.get("longitude")

        maps_links = ""
        if lat and lng:
            maps_links = (
                f"\n\n🗺 *Google Xarita:* https://maps.google.com/?q={lat},{lng}\n"
                f"📍 *Yandex Xarita:* https://yandex.com/maps/?pt={lng},{lat}&z=17&l=map"
            )

        msg_text = (
            f"🛒 *YANGI BUYURTMA*\n\n"
            f"👤 *Mijoz:* {user_name}\n"
            f"📞 *Telefon:* {phone}\n"
            f"📍 *Manzil / Lokatsiya:* {location_address}{maps_links}\n\n"
            f"📝 *Buyurtma ro'yxati:*\n{items_text}\n\n"
            f"🆔 ID: `{order_id}`"
        )

        buttons = {
            "inline_keyboard": [
                [
                    {"text": "✅ Qabul qilish", "callback_data": f"order_accept_{order_id}"},
                    {"text": "❌ Rad etish", "callback_data": f"order_reject_{order_id}"},
                ]
            ]
        }

        # 1. Xabar yuborish
        send_message(recipient_id, msg_text, reply_markup=buttons)

        # 2. Aniq Telegram Lokatsiya Pin'ini yuborish
        if lat and lng:
            send_location(recipient_id, float(lat), float(lng))

        return jsonify({"success": True, "message": "Buyurtma botga muvaffaqiyatli yuborildi!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/set_webhook", methods=["GET"])
def set_webhook_url():
    """Webhook manzilini Telegram API ga ulash"""
    try:
        webhook_url = "https://sayfulloh.pythonanywhere.com/webhook"
        res = send_telegram_request("setWebhook", {"url": webhook_url})
        return jsonify({
            "success": True,
            "configured_webhook_url": webhook_url,
            "telegram_response": res
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
