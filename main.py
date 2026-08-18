import os
import sys
import time
import json
import urllib.request
import urllib.parse
import subprocess
import threading

BOT_TOKEN = "8682502517:AAHMdw97lxztbMfZTWqGJBXL7pNjSsoE0OU"
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
BACKEND_URL = "http://localhost:5000/api"

print("==========================================================")
print("🤖 RAQAMLI MAHALLA TELEGRAM BOTI ISHGA TUSHMOQDA...")
print("==========================================================")

def send_request(method, data=None):
    url = f"{API_URL}/{method}"
    try:
        if data:
            req_data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=req_data, headers={'Content-Type': 'application/json'})
        else:
            req = urllib.request.Request(url)
        
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ Telegram API xatolik ({method}): {e}")
        return None

def start_backend_server():
    """Ensure backend server is running"""
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    print("⚡ Backend server tekshirilmoqda...")
    try:
        with urllib.request.urlopen(f"{BACKEND_URL}/health") as resp:
            if resp.status == 200:
                print("✅ Backend server allaqachon faol! (http://localhost:5000)")
                return
    except Exception:
        print("🚀 Backend server ishga tushirilmoqda...")
        subprocess.Popen(["npm", "run", "dev"], cwd=backend_dir, shell=True)

def handle_update(update):
    """Handle incoming Telegram update"""
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        from_user = msg.get("from", {})
        telegram_id = str(from_user.get("id", ""))
        text = msg.get("text", "")
        contact = msg.get("contact")

        # Contact shared
        if contact:
            phone = contact.get("phone_number", "")
            if not phone.startsWith("+") if hasattr(phone, "startsWith") else not phone.startswith("+"):
                phone = "+" + phone
            
            print(f"📱 Yangi kontakt olindi: {phone} (ID: {telegram_id})")
            send_request("sendMessage", {
                "chat_id": chat_id,
                "text": f"✅ *Telefon raqamingiz tasdiqlandi!*\n\n📞 {phone}\n👤 {from_user.get('first_name', '')}\n\nIlovaga qaytib foydalanishni davom ettirishingiz mumkin.",
                "parse_mode": "Markdown",
                "reply_markup": {"remove_keyboard": True}
            })
            return

        # /start command
        if text.startswith("/start"):
            parts = text.split()
            token_param = parts[1] if len(parts) > 1 else None

            # Fetch auth record code from backend or display code
            code_msg = ""
            if token_param:
                try:
                    with urllib.request.urlopen(f"{BACKEND_URL}/auth/check-status?telegramAuthToken={token_param}") as resp:
                        pass
                except Exception:
                    pass

            send_request("sendMessage", {
                "chat_id": chat_id,
                "text": "🏛 *RAQAMLI MAHALLA TASDIQLASH KODI*\n\nSizning kirish kodingiz Telegram botingizga yuborildi.\nUshbu 6 xonali SMS kodini ilovaga kiriting!\n\nAgar kod kelmagan bo'lsa, ilovada telefon raqamingizni qayta kiriting.",
                "parse_mode": "Markdown"
            })

def poll_telegram_updates():
    """Poll Telegram Bot updates continuously"""
    offset = 0
    print("🤖 Telegram Bot Polling aktiv rejimda...")
    while True:
        try:
            res = send_request("getUpdates", {"offset": offset, "timeout": 20})
            if res and res.get("ok"):
                for update in res.get("result", []):
                    offset = update["update_id"] + 1
                    handle_update(update)
        except Exception as e:
            print(f"Polling xatosi: {e}")
        time.sleep(1)

if __name__ == "__main__":
    start_backend_server()
    poll_telegram_updates()
