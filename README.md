# Qarz daftari

Do'kon egalari uchun qarzdorlar daftari: web sayt + Android ilova (SMS eslatmalar SIM karta orqali).

## Tuzilishi
- `server/` — API (Node.js, Express, Prisma, PostgreSQL), cron: SMS eslatmalar (9:00, 14:00), Telegram hisobot (9:05)
- `web/` — web sayt (React, Vite, Tailwind) va `web/android` — Capacitor Android ilova
- `web/android/.../SmsGatewayPlugin.java`, `SmsWorker.java` — har 15 daqiqada serverdan SMS navbatini olib, telefon SIM kartasidan yuboradi

## Bepul o'rnatish (Render + Neon)
1. https://neon.tech da bepul baza oching, **Connection string** ni nusxalang ("Connection pooling" o'chiq holda).
2. https://render.com ga GitHub orqali kiring → **New → Blueprint** → shu repo. `DATABASE_URL` ga Neon manzilini qo'ying.
3. Sayt `https://qarz-daftari.onrender.com` kabi manzilda ochiladi.
4. (Ixtiyoriy) https://uptimerobot.com da `.../api/health` ni har 5 daqiqada tekshiradigan monitor qo'shing — server uxlab qolmaydi.

## O'z serveringizga o'rnatish (VPS)
```bash
git clone <repo> && cd qarz-daftari
cp .env.example .env   # JWT_SECRET, DB_PASSWORD, DOMAIN ni to'ldiring
docker compose --profile https up -d --build
```
Sayt `https://DOMAIN` da ochiladi. Baza har kuni `./backups` ga zaxiralanadi (14 kun saqlanadi).

## APK
GitHub Actions har `main` ga push qilinganda APK yig'adi va **Releases → latest** ga joylaydi.
Repo Settings → Variables → `API_URL` = `https://DOMAIN` qo'ying (ilova shu serverga ulanadi).
Imzolangan release uchun secrets: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`.

## SMS qanday ishlaydi
1. Server muddati yaqin/o'tgan qarzdorlar uchun SMS ni navbatga qo'yadi (do'kon sozlamalaridagi qoidalar bo'yicha).
2. Egasi hisobi bilan kirilgan Android telefonda Sozlamalar → "Bu telefondan SMS yuborish" yoqiladi.
3. Telefon har 15 daqiqada navbatni olib, SIM orqali yuboradi va natijani serverga qaytaradi.

## Lokal ishga tushirish
```bash
cd server && cp .env.example .env
npm i && npx prisma migrate dev && npm run dev
cd ../web && npm i && npm run dev     # http://localhost:5173
```
