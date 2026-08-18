#!/usr/bin/env python3
"""
🏛 DO'KONIM - TO'LIQ CLOUD BACKEND & TELEGRAM BOT (PythonAnywhere Versiyasi)
Dokonim.vercel.app va Telegram Bot uchun 100% to'liq API server.
"""

import os
import sys
import json
import sqlite3
import uuid
import random
import datetime
from flask import Flask, request, jsonify

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
BOT_USERNAME = "dokonim_qorgonobod_bot"
STORE_TELEGRAM_ID = "6473433651"
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokonim.db")

app = Flask(__name__)
application = app

# ==============================================================================
# BAZA (SQLITE) INIT
# ==============================================================================
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            phone TEXT UNIQUE,
            firstName TEXT,
            lastName TEXT,
            role TEXT DEFAULT 'USER',
            isFaceVerified INTEGER DEFAULT 1,
            isBlocked INTEGER DEFAULT 0,
            balance INTEGER DEFAULT 10,
            createdAt TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS auth_requests (
            token TEXT PRIMARY KEY,
            phone TEXT,
            code TEXT,
            isVerified INTEGER DEFAULT 0,
            createdAt TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            userId TEXT,
            phone TEXT,
            userName TEXT,
            text TEXT,
            locationAddress TEXT,
            latitude REAL,
            longitude REAL,
            status TEXT DEFAULT 'PENDING',
            createdAt TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ==============================================================================
# CORS (Vercel va hamma joydan ulanish uchun)
# ==============================================================================
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# ==============================================================================
# TELEGRAM API YORDAMCHI FUNKSIYALARI
# ==============================================================================
def send_telegram_request(method, data=None):
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
    try:
        payload = {
            "chat_id": chat_id,
            "latitude": float(latitude),
            "longitude": float(longitude),
        }
        return send_telegram_request("sendLocation", payload)
    except Exception as e:
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
    try:
        if "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb.get("id")
            data = cb.get("data", "")
            msg = cb.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            msg_id = msg.get("message_id")

            if data.startswith("order_accept_"):
                order_id = data.replace("order_accept_", "")
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("UPDATE orders SET status='ACCEPTED' WHERE id=?", (order_id,))
                conn.commit()
                conn.close()

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
                order_id = data.replace("order_reject_", "")
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("UPDATE orders SET status='REJECTED' WHERE id=?", (order_id,))
                conn.commit()
                conn.close()

                answer_callback_query(cb_id, "Buyurtma rad etildi ❌")
                send_telegram_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": msg_id,
                    "text": f"❌ *BUYURTMA RAD ETILDI*\n\nID: `{order_id}`",
                    "parse_mode": "Markdown"
                })

            elif data.startswith("order_deliver_"):
                order_id = data.replace("order_deliver_", "")
                conn = sqlite3.connect(DB_FILE)
                c = conn.cursor()
                c.execute("UPDATE orders SET status='DELIVERED' WHERE id=?", (order_id,))
                c.execute("SELECT userId FROM orders WHERE id=?", (order_id,))
                row = c.fetchone()
                if row:
                    c.execute("UPDATE users SET balance = balance + 8 WHERE id=?", (row[0],))
                conn.commit()
                conn.close()

                answer_callback_query(cb_id, "Yetkazib berildi deb belgilandi! 🎉")
                send_telegram_request("editMessageText", {
                    "chat_id": chat_id,
                    "message_id": msg_id,
                    "text": "🚚 *BUYURTMA YETKAZIB BERILDI* ✅\n\n✨ Mijozga +8 Coin muvaffaqiyatli taqdim etildi!",
                    "parse_mode": "Markdown"
                })
            return

        if "message" in update:
            msg = update["message"]
            chat_id = msg["chat"]["id"]
            from_user = msg.get("from", {})
            first_name = from_user.get("first_name", "Foydalanuvchi")
            text = msg.get("text", "")
            contact = msg.get("contact")

            if contact:
                phone = contact.get("phone_number", "")
                if not phone.startswith("+"):
                    phone = "+" + phone

                send_message(
                    chat_id,
                    f"✅ *Telefon raqamingiz muvaffaqiyatli tasdiqlandi!*\n\n"
                    f"📞 {phone}\n"
                    f"👤 {first_name}\n\n"
                    f"Endi Do'konim ilovasiga (dokonim.vercel.app) qaytib bemalol foydalanishingiz mumkin.",
                    reply_markup={"remove_keyboard": True}
                )
                return

            if text.startswith("/start"):
                parts = text.split()
                auth_token_param = parts[1] if len(parts) > 1 else None

                if auth_token_param:
                    conn = sqlite3.connect(DB_FILE)
                    c = conn.cursor()
                    c.execute("SELECT code FROM auth_requests WHERE token=?", (auth_token_param,))
                    req_row = c.fetchone()
                    conn.close()
                    if req_row:
                        send_message(
                            chat_id,
                            f"🔐 *KIRISH TASDIQLASH KODI:*\n\n"
                            f"👉 `{req_row[0]}`\n\n"
                            f"Ushbu kodni Do'konim ilovasiga kiriting!",
                        )
                        return

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
        print(f"Update error: {e}")

# ==============================================================================
# REST API (VERCEL UCHUN)
# ==============================================================================
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "active",
        "service": "Do'konim Full-Stack Cloud Server",
        "message": "API va Telegram Bot 24/7 faol ishlamoqda!"
    })

@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        update = request.get_json(force=True, silent=True)
        if update:
            process_update(update)
    except Exception as e:
        pass
    return "OK", 200

# 1. /api/auth/request-telegram
@app.route("/api/auth/request-telegram", methods=["POST", "OPTIONS"])
def api_request_telegram():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json(force=True, silent=True) or {}
        phone = data.get("phone", "").strip()
        if not phone:
            return jsonify({"success": False, "message": "Telefon raqami kiritilmadi"}), 400

        auth_token = str(uuid.uuid4())
        code = str(random.randint(100000, 999999))
        now_str = datetime.datetime.utcnow().isoformat()

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO auth_requests (token, phone, code, isVerified, createdAt) VALUES (?, ?, ?, 0, ?)", (auth_token, phone, code, now_str))
        conn.commit()
        conn.close()

        # Botga xabar: Tasdiqlash kodi
        send_message(
            STORE_TELEGRAM_ID,
            f"🔑 *Yangi kirish kodi:*\n📞 {phone}\n🔢 Kod: `{code}`\n\nIlovaga kiriting!"
        )

        return jsonify({
            "success": True,
            "telegramAuthToken": auth_token,
            "botLink": f"https://t.me/{BOT_USERNAME}?start={auth_token}",
            "debugCode": code,
            "message": "Tasdiqlash kodi Telegram botingizga yuborildi!"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# 2. /api/auth/verify-code
@app.route("/api/auth/verify-code", methods=["POST", "OPTIONS"])
def api_verify_code():
    if request.method == "OPTIONS":
        return "", 200
    try:
        data = request.get_json(force=True, silent=True) or {}
        phone = data.get("phone", "").strip()
        input_code = str(data.get("code", "")).strip()
        auth_token = data.get("telegramAuthToken", "")

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT code FROM auth_requests WHERE token=? OR phone=?", (auth_token, phone))
        row = c.fetchone()

        # Kod to'g'ri bo'lsa yoki universal test kodi
        if not row or (row[0] != input_code and input_code != "777777" and input_code != "123456"):
            conn.close()
            return jsonify({"success": False, "message": "Noto'g'ri kod kiritildi! Iltimos, Telegram botga kelgan kodni tekshiring."}), 400

        # Foydalanuvchini olish yoki yaratish
        c.execute("SELECT id, phone, firstName, lastName, role, isFaceVerified, isBlocked, balance FROM users WHERE phone=?", (phone,))
        user_row = c.fetchone()

        now_str = datetime.datetime.utcnow().isoformat()
        if not user_row:
            user_id = str(uuid.uuid4())
            first_name = "Foydalanuvchi"
            last_name = phone[-4:]
            c.execute(
                "INSERT INTO users (id, phone, firstName, lastName, role, isFaceVerified, isBlocked, balance, createdAt) VALUES (?, ?, ?, ?, 'USER', 1, 0, 10, ?)",
                (user_id, phone, first_name, last_name, now_str)
            )
            conn.commit()
            user_data = {
                "id": user_id,
                "phone": phone,
                "firstName": first_name,
                "lastName": last_name,
                "role": "USER",
                "isFaceVerified": True,
                "isBlocked": False,
                "coinBalance": {"balance": 10}
            }
        else:
            user_data = {
                "id": user_row[0],
                "phone": user_row[1],
                "firstName": user_row[2],
                "lastName": user_row[3],
                "role": user_row[4],
                "isFaceVerified": bool(user_row[5]),
                "isBlocked": bool(user_row[6]),
                "coinBalance": {"balance": user_row[7]}
            }
        conn.close()

        return jsonify({
            "success": True,
            "token": user_data["id"],
            "user": user_data,
            "message": "Muvaffaqiyatli tasdiqlandi!"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# 3. /api/auth/check-status
@app.route("/api/auth/check-status", methods=["GET", "OPTIONS"])
def api_check_status():
    if request.method == "OPTIONS":
        return "", 200
    try:
        auth_token = request.args.get("telegramAuthToken", "")
        phone = request.args.get("phone", "")

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("SELECT isVerified FROM auth_requests WHERE token=? OR phone=?", (auth_token, phone))
        row = c.fetchone()
        conn.close()

        if row and row[0] == 1:
            return jsonify({"success": True, "isVerified": True})
        return jsonify({"success": True, "isVerified": False})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# 4. /api/auth/profile
@app.route("/api/auth/profile", methods=["GET", "OPTIONS"])
def api_profile():
    if request.method == "OPTIONS":
        return "", 200
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip()
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        if token:
            c.execute("SELECT id, phone, firstName, lastName, role, isFaceVerified, isBlocked, balance FROM users WHERE id=?", (token,))
            user_row = c.fetchone()
        else:
            user_row = None

        if not user_row:
            c.execute("SELECT id, phone, firstName, lastName, role, isFaceVerified, isBlocked, balance FROM users LIMIT 1")
            user_row = c.fetchone()

        if user_row:
            user_data = {
                "id": user_row[0],
                "phone": user_row[1],
                "firstName": user_row[2],
                "lastName": user_row[3],
                "role": user_row[4],
                "isFaceVerified": bool(user_row[5]),
                "isBlocked": bool(user_row[6]),
                "coinBalance": {"balance": user_row[7]}
            }
            conn.close()
            return jsonify({"success": True, "user": user_data})
        
        conn.close()
        return jsonify({"success": False, "message": "Foydalanuvchi topilmadi"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# 5. /api/orders (GET & POST)
@app.route("/api/orders", methods=["GET", "POST", "OPTIONS"])
def api_orders():
    if request.method == "OPTIONS":
        return "", 200
    if request.method == "GET":
        try:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            if token:
                c.execute("SELECT id, userId, phone, userName, text, locationAddress, latitude, longitude, status, createdAt FROM orders WHERE userId=? ORDER BY createdAt DESC", (token,))
            else:
                c.execute("SELECT id, userId, phone, userName, text, locationAddress, latitude, longitude, status, createdAt FROM orders ORDER BY createdAt DESC")
            
            rows = c.fetchall()
            orders = []
            for r in rows:
                orders.append({
                    "id": r[0],
                    "userId": r[1],
                    "phone": r[2],
                    "userName": r[3],
                    "text": r[4],
                    "locationAddress": r[5],
                    "latitude": r[6],
                    "longitude": r[7],
                    "status": r[8],
                    "createdAt": r[9]
                })
            conn.close()
            return jsonify({"success": True, "orders": orders, "canOrderToday": True})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    elif request.method == "POST":
        try:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            data = request.get_json(force=True, silent=True) or {}

            text = data.get("text", "").strip()
            location_address = data.get("locationAddress", "")
            lat = data.get("latitude")
            lng = data.get("longitude")

            if not text:
                return jsonify({"success": False, "message": "Mahsulotlar ro'yxati kiritilmadi"}), 400

            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute("SELECT id, phone, firstName, lastName FROM users WHERE id=?", (token,))
            user_row = c.fetchone()
            
            user_id = user_row[0] if user_row else str(uuid.uuid4())
            phone = user_row[1] if user_row else "+998"
            user_name = f"{user_row[2]} {user_row[3]}".strip() if user_row else "Mijoz"

            order_id = str(uuid.uuid4())[:8].upper()
            now_str = datetime.datetime.utcnow().isoformat()

            c.execute(
                "INSERT INTO orders (id, userId, phone, userName, text, locationAddress, latitude, longitude, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)",
                (order_id, user_id, phone, user_name, text, location_address, lat, lng, now_str)
            )
            conn.commit()
            conn.close()

            # Telegram botga xabar yuborish
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
                f"📍 *Manzil:* {location_address}{maps_links}\n\n"
                f"📝 *Buyurtma:* {text}\n\n"
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

            send_message(STORE_TELEGRAM_ID, msg_text, reply_markup=buttons)

            if lat and lng:
                send_location(STORE_TELEGRAM_ID, float(lat), float(lng))

            return jsonify({
                "success": True,
                "message": "Buyurtmangiz muvaffaqiyatli qabul qilindi va do'konga yuborildi!",
                "order": {
                    "id": order_id,
                    "text": text,
                    "status": "PENDING",
                    "createdAt": now_str
                }
            })
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

# 6. /set_webhook
@app.route("/set_webhook", methods=["GET"])
def set_webhook_url():
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
