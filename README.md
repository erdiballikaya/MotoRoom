# MotoRoom MVP

MotoRoom, motosiklet kullanıcılarını marka ve model bazlı odalarda bir araya getiren mobil MVP'dir. Kullanıcılar model seçer, geçmiş konuşmaları görür, kronik sorun notlarını inceler ve sohbete katılır.

## Yapı

- `apps/mobile`: Expo tabanlı React Native uygulaması
- `apps/backend`: Express tabanlı örnek API

## Mobil uygulama

```bash
cd apps/mobile
npm install
npm run ios
```

Android için:

```bash
cd apps/mobile
npm run android
```

Telefon veya Expo Go ile test edeceksen `apps/mobile/.env.example` dosyasini `.env` olarak kopyalayip backend adresini gir:

```bash
cd apps/mobile
cp .env.example .env
```

Ornek:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=GOOGLE_ANDROID_CLIENT_ID
```

Render'a gecince ayni alan production backend URL'sine donmeli:

```env
EXPO_PUBLIC_API_URL=https://motoroom-backend.onrender.com
```

Mobil uygulama önce yerel backend'e bağlanmayı dener:

- iOS simulator: `http://127.0.0.1:4000`
- Android emulator: `http://10.0.2.2:4000`

Auth sistemi aktif oldugu icin backend kapaliysa giris/kayit istekleri calismaz. Katalog tarafinda ise veri cekilemezse uygulama oda listesini demo veriyle gostermeye devam eder.

## Backend

```bash
cd apps/backend
npm install
npm run dev
```

Local backend ayarlari icin `apps/backend/.env.example` dosyasini `.env` olarak kopyalayabilirsin:

```bash
cd apps/backend
cp .env.example .env
```

Varsayilan gelistirme akisi artik MongoDB uzerinden:

```env
MONGODB_URI=mongodb://localhost:27017/motoroom
JWT_SECRET=super-secret-value
```

- `MONGODB_URI` varsa backend MongoDB'ye baglanir, gerekli collection/index yapisini olusturur ve seed veriyi eksikse yukler.
- `MONGODB_URI` yok ama `DATABASE_URL` varsa mevcut Postgres akisina duser.
- Ikisi de yoksa bellek ici demo store ile calisir.

Eski Postgres akisina devam etmek istersen ayni `.env` icinde `DATABASE_URL` tanimlayabilirsin.

Google Cloud SQL tarafinda local gelistirme icin en saglikli yol Cloud SQL Auth Proxy ile local `127.0.0.1:5432` uzerinden baglanmak.

Auth tarafi icin ayni `.env` dosyasina su alanlari eklenebilir:

```env
JWT_SECRET=super-secret-value
GOOGLE_AUTH_CLIENT_IDS=google-client-id-1,google-client-id-2
APPLE_AUTH_AUDIENCES=com.erdiballikaya.motoroom
```

Notlar:

- `GOOGLE_AUTH_CLIENT_IDS` backend tarafinda Google `id_token` dogrulamasinda kullanilir.
- `APPLE_AUTH_AUDIENCES` opsiyoneldir. Expo Go ile testte Apple kimlik degerleri farkli olabildigi icin bos birakip sadece imza/issuer dogrulamasi yapabilirsin.
- Uygulama ilk acilista giris/kayit ekrani gosterir. E-posta+sifre, Google ve iOS tarafinda Apple ile giris hazirdir.
- Google girisi su anda browser tabanli Expo AuthSession ile kuruludur. Expo dokumantasyonu production icin native Google Sign-In kutuphanesini onerir.

## Render Deploy

Root dizinde hazir bir [render.yaml](/Volumes/KIOXIA/MotoRoom/render.yaml) var. Render'da yeni bir Blueprint veya Web Service olustururken bunu kullanabilirsin.

Servis ayarlari:

- Runtime: `Docker`
- Root directory: `apps/backend`
- Dockerfile path: `./Dockerfile`
- Health check path: `/health`

Gerekli env degiskenleri:

```env
JWT_SECRET=super-secret-value
GOOGLE_AUTH_CLIENT_IDS=google-client-id-1,google-client-id-2
APPLE_AUTH_AUDIENCES=com.erdiballikaya.motoroom
MONGODB_DATA_PATH=/data/db
```

Notlar:

- `PORT` degerini Render otomatik verir; backend bunu zaten kullanir.
- `MONGODB_URI` bos birakilirsa container kendi icinde lokal MongoDB baslatir ve backend buna `mongodb://127.0.0.1:27017/motoroom` ile baglanir.
- Render free instance yeniden basladiginda container ici Mongo verisi kalici olmaz. Kalici veri istiyorsan persistent disk bagla ve `MONGODB_DATA_PATH=/data/db` kullan.
- Dis bir Mongo kullanmak istersen `MONGODB_URI` verip container ici Mongo baslangicini bypass edebilirsin.
- Render URL'si hazir olunca mobile tarafinda `EXPO_PUBLIC_API_URL` degerini bu URL ile guncelleyip yeni build al.

API uçları:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social/google`
- `POST /api/auth/social/apple`
- `GET /api/auth/me`
- `GET /health`
- `GET /api/catalog`
- `GET /api/brands`
- `GET /api/rooms/:roomId`
- `GET /api/rooms/:roomId/messages`
- `POST /api/rooms/:roomId/messages`

Not: Hem `MONGODB_URI` hem `DATABASE_URL` bossa backend bellek ici veri kullanir. Bu modda yeniden baslatildiginda eklenen mesajlar sifirlanir.

## Docker

Backend ve MongoDB'yi Docker ile kaldirmak icin root dizinde:

```bash
docker compose up --build
```

veya npm script ile:

```bash
npm run docker:up
```

Arka planda kaldirip simulatoru tek komutla acmak istersen:

```bash
npm run dev:ios
```

veya:

```bash
npm run dev:android
```

Bu stack su servisleri acar:

- `backend`: `http://localhost:4000`
- `mongodb`: `mongodb://localhost:27017`

Compose varsayilan olarak backend container icinde `MONGODB_URI=mongodb://mongodb:27017/motoroom` kullanir. Gerekirse shell ortamindan su degerleri override edebilirsin:

```bash
BACKEND_PORT=4001 MONGODB_PORT=27018 JWT_SECRET=local-secret docker compose up --build
```

Stack'i kapatmak icin:

```bash
npm run docker:down
```

## TestFlight

Mobil app artik EAS project'e bagli ve iOS bundle identifier olarak `com.erdiballikaya.motoroom` kullanacak sekilde hazirlandi.

Ilk TestFlight cikisi icin gerekenler:

- Expo hesabi: `@erdiballikaya`
- Apple Developer hesabina giris
- App Store Connect'te `MotoRoom` icin app kaydi
- Backend tarafinda `APPLE_AUTH_AUDIENCES` degerinin ayni bundle ID ile eslesmesi

Build + upload icin:

```bash
npm run testflight:ios
```

Mevcut bir build'i sonradan upload etmek icin:

```bash
cd apps/mobile
npx eas-cli submit --platform ios --profile production
```

Notlar:

- EAS project ID: `4bc1d782-351b-465d-a0db-2e25f3b0d495`
- Expo dokumanina gore iOS uploadlari App Store Connect'e gider ve TestFlight'ta gorunur; production release ayrica App Store Connect uzerinden manuel yapilir.
- Yine Expo dokumanina gore build credential uretmek icin Apple Developer account yetkisi gerekir; federated/kurumsal akislarda ASC API key de kullanilabilir.

## Root komutları

```bash
npm run backend
npm run docker:up
npm run docker:up:detached
npm run docker:down
npm run dev:ios
npm run dev:android
npm run testflight:ios
npm run ios
npm run android
npm run typecheck
```
# MotoRoom
# MotoRoom
# MotoRoom
