# Auth Strategy

Dokumen ini menetapkan bahwa `jimun-server` memakai auth **session-based** dengan Better Auth, lalu menjelaskan bagaimana auth server ini dikonsumsi oleh app lain, baik web maupun mobile.

Fokus dokumen ini adalah kontrak yang benar-benar didukung implementasi repo saat ini.

## 1. Keputusan Arsitektur

- Sumber identitas utama adalah session yang disimpan di database tabel `session`.
- Session browser memakai cookie `better-auth.session_token`.
- Session mobile Expo memakai Better Auth Expo client yang menyimpan cookie session secara aman di SecureStore.
- Semua session dicatat dengan metadata `clientType` agar bisa dipantau per device/surface.
- Admin dapat melihat session aktif dan melakukan revoke per session atau per user.

Implementasi utama ada di:

- `src/lib/auth.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/auth-api.ts`
- `src/lib/auth-platform.ts`
- `src/lib/api-cors.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/sessions/[sessionId]/revoke/route.ts`
- `src/app/api/admin/users/[userId]/revoke-sessions/route.ts`
- `prisma/schema.prisma`

## 2. Apa yang Disimpan di Session

Setiap session menyimpan data inti berikut:

- `id`
- `userId`
- `token`
- `expiresAt`
- `createdAt`
- `updatedAt`
- `ipAddress`
- `userAgent`
- `clientType`
- `impersonatedBy`

`clientType` diisi dari header `X-Client-Type`, lalu dinormalisasi menjadi:

- `web`
- `ios`
- `android`
- `native`
- `unknown`

Artinya project ini memang siap untuk:

- membedakan session web vs app
- monitoring device login aktif
- revoke satu session tertentu
- revoke semua session milik satu user

## 3. Base URL, Base Path, dan Origin

Base path auth selalu:

```text
/api/auth
```

Contoh:

```text
https://api.example.com/api/auth/sign-in/email
https://api.example.com/api/auth/get-session
```

Base URL server dibaca dari:

- `BETTER_AUTH_URL`
- atau `BETTER_AUTH_URL_PRODUCTION`
- atau `BETTER_AUTH_URL_DEVELOPMENT`

Origin yang diizinkan dibaca dari:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `API_ALLOWED_ORIGINS`

Catatan penting untuk web beda domain:

- Browser cross-origin harus pakai `credentials: "include"` atau `withCredentials: true`.
- Origin frontend harus masuk trusted origins.
- Di production cookie diset `SameSite=None` dan `Secure=true`, jadi flow web beda domain ditujukan untuk HTTPS production.
- Di non-production cookie diset `SameSite=Lax`, jadi jangan jadikan cross-domain local dev sebagai kontrak utama untuk web.

Catatan untuk mobile:

- Mobile native tidak punya konsep origin browser seperti web app.
- Mobile tidak perlu bergantung pada cookie.
- Flow yang direkomendasikan adalah Better Auth Expo cookie session.
- Dalam flow normal mobile, Anda tidak perlu menyiapkan origin URL/domain khusus hanya untuk auth.
- Backend memperlakukan request dengan `X-Client-Type: ios`, `android`, atau `native` sebagai native app request.
- Jika runtime mobile tetap mengirim header `Origin` atau `Referer` dari scheme app/dev tooling, Better Auth akan menerima origin request tersebut secara dinamis selama request ditandai sebagai native app.
- Allowance dinamis ini hanya untuk validasi auth internal, bukan untuk membuka CORS browser arbitrer.

## 4. Strategi Konsumsi per Client

| Client              | Transport auth yang direkomendasikan | Yang disimpan di client                                          | Catatan                                                   |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------- |
| Web same-domain     | Cookie session                       | Tidak perlu simpan token manual                                  | Paling sederhana                                          |
| Web beda domain     | Cookie session                       | Tidak perlu simpan token manual                                  | Wajib trusted origin, HTTPS, dan `credentials: "include"` |
| Mobile / native app | Better Auth Expo cookie session      | Better Auth Expo menyimpan cache session + cookie di SecureStore | Tidak bergantung pada cookie browser                      |

## 5. Header yang Perlu Dikirim

Header umum:

- `Content-Type: application/json` untuk request body JSON
- `X-Client-Type: web | ios | android | native`

Header auth:

- Web: browser akan mengirim cookie session bila request memakai credentials
- Mobile: Better Auth Expo client akan mengirim header `Cookie` dari cookie session yang disimpan aman

Header request tambahan untuk Expo native:

- `expo-origin: <scheme://...>` dikirim oleh Better Auth Expo client
- `X-Client-Type: ios | android | native` tetap direkomendasikan agar backend bisa mencatat surface session dengan jelas

## 6. Flow Auth yang Canonical

### 6.1 Web

1. Client memanggil `POST /api/auth/sign-in/email` atau `POST /api/auth/sign-up/email`.
2. Client mengirim `X-Client-Type: web`.
3. Browser menerima cookie `better-auth.session_token`.
4. Client langsung memanggil `GET /api/auth/get-session`.
5. Response `get-session` menjadi source of truth user yang sedang login.

### 6.2 Mobile

1. Client memanggil `POST /api/auth/sign-in/email` atau `POST /api/auth/sign-up/email`.
2. Client mengirim `X-Client-Type: ios`, `android`, atau `native`.
3. Better Auth Expo client menyimpan cookie session ke SecureStore.
4. Semua request auth berikutnya mengirim header `Cookie` secara otomatis lewat plugin Expo client.
5. Better Auth Expo client juga mengirim `expo-origin` agar validasi origin server tetap lolos di flow native.
6. Client memanggil `GET /api/auth/get-session` untuk bootstrap state user.

### 6.3 Setelah Login

Jangan menjadikan body response `sign-in` atau `sign-up` sebagai source of truth utama. Kontrak yang paling stabil untuk semua client adalah:

1. autentikasi berhasil
2. session berhasil dibuat
3. client memanggil `GET /api/auth/get-session`
4. state auth diambil dari response `get-session`

## 7. Kontrak Endpoint Auth

### 7.1 `POST /api/auth/sign-up/email`

Tujuan: membuat akun baru dengan email/password.

Request body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "supersecret123"
}
```

Request headers:

- Web: `Content-Type`, `X-Client-Type: web`
- Mobile: `Content-Type`, `X-Client-Type: ios|android|native`

Success response:

- status `200`
- session dibuat
- web menerima cookie session
- mobile menerima `Set-Cookie` yang akan ditangani otomatis oleh Better Auth Expo client

Error yang perlu diantisipasi:

- `400` / `422` untuk payload tidak valid
- `409` bila email sudah dipakai

### 7.2 `POST /api/auth/sign-in/email`

Tujuan: login dengan email/password.

Request body:

```json
{
  "email": "jane@example.com",
  "password": "supersecret123"
}
```

Request headers:

- Web: `Content-Type`, `X-Client-Type: web`
- Mobile: `Content-Type`, `X-Client-Type: ios|android|native`

Success response:

- status `200`
- session dibuat
- web menerima cookie session
- mobile menerima `Set-Cookie` yang akan ditangani otomatis oleh Better Auth Expo client

Error yang perlu diantisipasi:

- `401` bila credential salah
- `400` / `422` bila payload tidak valid

### 7.3 `GET /api/auth/get-session`

Tujuan: mengambil source of truth session aktif.

Request headers:

- Web: cookie session otomatis terkirim bila request memakai credentials
- Mobile: header `Cookie` dikirim otomatis oleh Better Auth Expo client

Success response saat session aktif:

```json
{
  "user": {
    "id": 12,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-04-17T08:10:00.000Z",
    "updatedAt": "2026-04-17T08:10:00.000Z",
    "firstName": null,
    "lastName": null,
    "phoneNumber": null,
    "role": "User",
    "banned": false,
    "banReason": null,
    "banExpires": null
  },
  "session": {
    "id": 31,
    "userId": 12,
    "expiresAt": "2026-04-24T08:10:00.000Z",
    "createdAt": "2026-04-17T08:10:00.000Z",
    "updatedAt": "2026-04-17T08:10:00.000Z",
    "ipAddress": null,
    "userAgent": "Mozilla/5.0 ...",
    "clientType": "web",
    "impersonatedBy": null
  }
}
```

Response saat belum ada session:

```json
null
```

Ini endpoint yang harus dipakai untuk:

- bootstrap auth state
- refresh auth state setelah app reload
- validasi apakah token/cookie masih aktif

### 7.4 `POST /api/auth/sign-out`

Tujuan: logout session yang sedang dipakai saat request.

Request headers:

- Web: cookie session
- Mobile: header `Cookie` dikirim otomatis oleh Better Auth Expo client

Success response:

- status `200`
- session saat ini dihapus / tidak valid lagi

Catatan:

- `sign-out` hanya memutus current session.
- Untuk memutus session lain milik user, gunakan endpoint admin revoke.

## 8. Perbedaan Integrasi Web vs Mobile

### 8.1 Web same-domain

Yang dibutuhkan consumer:

- base URL yang sama dengan app
- request dengan `credentials: "include"`
- header `X-Client-Type: web`

Yang dikirim:

- body JSON ke `sign-in` atau `sign-up`
- cookie akan dikelola browser

Yang diterima:

- cookie session
- optional `set-auth-token`
- data user final dari `GET /api/auth/get-session`

### 8.2 Web beda domain

Yang dibutuhkan consumer:

- frontend origin masuk ke `BETTER_AUTH_TRUSTED_ORIGINS` atau `API_ALLOWED_ORIGINS`
- HTTPS production
- request dengan `credentials: "include"`
- header `X-Client-Type: web`

Yang dikirim:

- body JSON ke endpoint auth
- browser akan ikut mengirim cookie setelah session terbentuk

Yang diterima:

- `Access-Control-Allow-Origin` sesuai origin request
- `Access-Control-Allow-Credentials: true`
- cookie session
- optional `set-auth-token`
- data user final dari `GET /api/auth/get-session`

### 8.3 Mobile / native app

Yang dibutuhkan consumer:

- base URL auth server
- Better Auth Expo client di aplikasi Expo
- `expo-secure-store` untuk cache session dan cookie
- header `X-Client-Type: ios`, `android`, atau `native`
- optional Google mobile client ID bila ingin login Google native dengan `idToken`

Yang dikirim:

- body JSON ke endpoint auth
- header `Cookie` dari Better Auth Expo client untuk request auth berikutnya
- header `expo-origin` untuk membantu validasi origin native
- untuk login Google native, app dapat mengirim `idToken.token` dan optional `idToken.accessToken` ke `signIn.social`

Yang diterima:

- `Set-Cookie` saat login/register sukses
- data user final dari `GET /api/auth/get-session`

Catatan:

- Untuk request server non-auth lain yang butuh session, Expo app dapat mengambil cookie header lewat `authClient.getCookie()`.
- Selama request mengirim `expo-origin` dan/atau `X-Client-Type: ios|android|native`, backend tidak mengharuskan origin mobile dimasukkan manual ke whitelist trusted origins untuk flow auth.
- Header CORS browser tetap hanya dikembalikan untuk origin web yang memang dikonfigurasi sebagai trusted origin.

## 9. Monitoring dan Revoke Session

Fitur ini bersifat **admin-only**. Auth yang dipakai untuk endpoint admin tetap session-based, jadi admin bisa mengaksesnya dengan cookie atau bearer token yang valid.

### 9.1 `GET /api/admin/users`

Tujuan: monitoring user dan session aktif.

Response berisi daftar user, dan untuk tiap user server mengembalikan:

- `sessionCount`
- `sessionSummary`: `offline | web | app | both | unknown`
- `sessions`: hanya session yang belum expired

Contoh bentuk item:

```json
{
  "id": 12,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": null,
  "role": "User",
  "banned": false,
  "banReason": null,
  "banExpires": null,
  "emailVerified": false,
  "createdAt": "2026-04-17T08:10:00.000Z",
  "sessionCount": 2,
  "sessionSummary": "both",
  "sessions": [
    {
      "id": 31,
      "clientType": "web",
      "clientSurface": "web",
      "userAgent": "Mozilla/5.0 ...",
      "ipAddress": "203.0.113.10",
      "impersonatedBy": null,
      "createdAt": "2026-04-17T08:10:00.000Z",
      "updatedAt": "2026-04-17T08:30:00.000Z",
      "expiresAt": "2026-04-24T08:10:00.000Z"
    }
  ]
}
```

Endpoint ini cocok untuk:

- dashboard monitoring login lintas device
- audit session web vs app
- memilih session mana yang perlu direvoke

### 9.2 `POST /api/admin/sessions/:sessionId/revoke`

Tujuan: revoke satu session tertentu.

Request body:

```json
{}
```

Response sukses:

```json
{
  "message": "Session berhasil direvoke."
}
```

### 9.3 `POST /api/admin/users/:userId/revoke-sessions`

Tujuan: revoke semua session aktif milik satu user.

Request body:

```json
{}
```

Response sukses:

```json
{
  "message": "Semua session user berhasil direvoke."
}
```

## 10. Checklist untuk App yang Mengonsumsi Auth Ini

### Untuk web

- pakai cookie session, bukan local storage token
- selalu kirim `credentials: "include"`
- kirim `X-Client-Type: web`
- setelah login/register, panggil `GET /api/auth/get-session`
- jika beda domain, whitelist origin dan gunakan HTTPS production

### Untuk mobile

- pakai `createAuthClient(..., expoClient(...))`, bukan fetch auth manual
- biarkan Better Auth Expo client menyimpan cookie + cache session di SecureStore
- kirim `X-Client-Type: ios`, `android`, atau `native`
- bootstrap auth state dari `useSession` / `GET /api/auth/get-session`
- untuk request server non-auth yang butuh session, pakai cookie dari `authClient.getCookie()`
- jika memakai Google sign-in native, siapkan Google client ID per platform dan kirim `idToken` ke Better Auth

### Untuk admin/ops

- gunakan `GET /api/admin/users` untuk monitoring session aktif
- gunakan `POST /api/admin/sessions/:sessionId/revoke` untuk memutus satu device/login
- gunakan `POST /api/admin/users/:userId/revoke-sessions` untuk force logout semua session user

## 11. Env yang Dibutuhkan

### 11.1 Auth server `jimun-server`

Env yang memang dibaca langsung oleh kode repo ini:

- `DATABASE_URL`
  Dipakai Prisma adapter untuk koneksi ke database session/user.
- `BETTER_AUTH_URL`
  Base URL utama auth server. Jika ini ada, env URL lain tidak dipakai.
- `BETTER_AUTH_URL_PRODUCTION`
  Fallback base URL saat `NODE_ENV=production` dan `BETTER_AUTH_URL` tidak diisi.
- `BETTER_AUTH_URL_DEVELOPMENT`
  Fallback base URL saat non-production dan `BETTER_AUTH_URL` tidak diisi.
- `BETTER_AUTH_TRUSTED_ORIGINS`
  Daftar origin tambahan yang boleh mengakses auth lintas origin, dipisah koma.
- `API_ALLOWED_ORIGINS`
  Daftar origin tambahan lain yang juga dianggap trusted, dipisah koma.
- `BETTER_AUTH_ADMIN_USER_IDS`
  Daftar user id admin awal, dipisah koma.
- `BETTER_AUTH_ADMIN_EMAILS`
  Daftar email yang otomatis diberi role admin saat user dibuat, dipisah koma.

Env yang tidak direferensikan eksplisit di repo ini tetapi secara praktik Better Auth biasanya tetap membutuhkan secret:

- `BETTER_AUTH_SECRET` atau `AUTH_SECRET`
  Ini saya tandai sebagai requirement Better Auth yang bersifat inferred. Saya sarankan tetap dianggap wajib di deployment auth server.

Contoh minimal:

```env
DATABASE_URL=postgresql://user:password@host:5432/jimun
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_TRUSTED_ORIGINS=https://app.example.com,https://admin.example.com
API_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
BETTER_AUTH_SECRET=replace-with-32+-char-secret
BETTER_AUTH_ADMIN_EMAILS=owner@example.com,ops@example.com
```

### 11.2 Web consumer

Secara kontrak server, web consumer tidak punya env auth yang wajib dari sisi backend selain mengetahui base URL API yang benar. Biasanya cukup siapkan:

- `NEXT_PUBLIC_API_URL`
  Base URL ke `jimun-server`, misalnya `https://api.example.com`.

Jika web app beda domain dengan auth server, origin web tersebut harus dimasukkan ke env server:

- `BETTER_AUTH_TRUSTED_ORIGINS`
- atau `API_ALLOWED_ORIGINS`

Contoh:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

### 11.3 Mobile consumer

Mobile juga tidak butuh origin URL/domain seperti web browser. Dari sisi integrasi, mobile biasanya hanya butuh tahu base URL auth server. Yang biasanya dibutuhkan:

- `EXPO_PUBLIC_API_URL`
  Base URL ke `jimun-server`, misalnya `https://api.example.com`.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  Google OAuth client id untuk login native di iOS.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
  Google OAuth client id untuk login native di Android.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  Optional. Berguna bila app Expo web juga ingin memakai Google client ID yang sama di layer client.

Header `Origin` atau `Referer` tambahan yang kadang ikut terbawa dari tooling mobile/dev tidak perlu di-whitelist manual selama request tetap mengirim `X-Client-Type: ios|android|native`.

Contoh:

```env
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
```

### 11.4 Ringkas per pihak

| Pihak            | Env minimum                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Auth server      | `DATABASE_URL`, `BETTER_AUTH_URL` atau pasangan `BETTER_AUTH_URL_PRODUCTION` / `BETTER_AUTH_URL_DEVELOPMENT`, lalu `BETTER_AUTH_SECRET` |
| Web consumer     | `NEXT_PUBLIC_API_URL`                                                                                                                   |
| Mobile consumer  | `EXPO_PUBLIC_API_URL`, lalu `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` bila memakai Google native sign-in |
| Jika beda domain | tambahkan origin consumer ke `BETTER_AUTH_TRUSTED_ORIGINS` atau `API_ALLOWED_ORIGINS` di auth server                                    |

## 12. Ringkasan Praktis

- Auth project ini tetap **session-based**.
- Web memakai **cookie session**.
- Mobile memakai **Better Auth Expo cookie session** yang tetap merepresentasikan session server yang sama.
- `GET /api/auth/get-session` adalah source of truth untuk membaca state login.
- Monitoring dan revoke session sudah tersedia lewat endpoint admin.
