# Auth API Integration Guide

Dokumen ini menjelaskan kontrak auth yang saat ini aktif di repo `jimun-server`, bagaimana endpoint Better Auth diakses dari aplikasi luar, dan pola implementasi yang disarankan untuk:

- React web
- React Native Expo

Dokumen ini sengaja fokus ke endpoint auth yang benar-benar relevan untuk konsumsi app luar. Fitur seperti email verification, password reset, dan social login belum diaktifkan di config repo ini, jadi belum dijadikan kontrak utama.

## 1. Ringkasan Arsitektur Auth Saat Ini

Backend ini memakai:

- `better-auth` sebagai auth engine
- route auth catch-all di `/api/auth/*`
- session cookie `better-auth.session_token`
- plugin `bearer()` sehingga auth juga bisa dipakai lewat `Authorization: Bearer <token>`
- plugin `admin()` untuk role admin

Sumber implementasi utama:

- `src/lib/auth.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/lib/auth-api.ts`
- `src/lib/auth-client.ts`
- `src/lib/auth-platform.ts`
- `src/lib/api-cors.ts`
- `prisma/schema.prisma`

Implikasi penting:

1. Browser web paling natural memakai cookie session.
2. Mobile paling mudah memakai bearer token dari header `set-auth-token`.
3. API bisnis internal repo ini sudah mendukung dua mode:
   - cookie auth
   - bearer auth

## 2. Base URL dan Base Path

Base path auth adalah:

```text
/api/auth
```

Contoh full URL:

```text
https://api.example.com/api/auth/sign-in/email
https://api.example.com/api/auth/get-session
```

Nilai base URL di server dibaca dari:

- `BETTER_AUTH_URL`
- atau `BETTER_AUTH_URL_PRODUCTION`
- atau `BETTER_AUTH_URL_DEVELOPMENT`

## 3. CORS dan Origin yang Diizinkan

Route auth dibungkus CORS custom. Origin hanya diterima bila match salah satu dari:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `API_ALLOWED_ORIGINS`

Header penting:

- request:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` untuk mode mobile/bearer
  - `X-Client-Type: web | ios | android | native`
- response:
  - `set-auth-token: <session_token>` jika login/signup berhasil dan plugin bearer aktif

Catatan:

- server expose header `set-auth-token`, jadi frontend bisa membacanya dari JavaScript
- `OPTIONS` preflight sudah ditangani
- browser cross-origin wajib kirim `credentials: "include"` jika memakai cookie

## 4. Header `X-Client-Type`

Server membaca header:

```text
X-Client-Type
```

Nilai yang didukung:

- `web`
- `ios`
- `android`
- `native`

Nilai ini disimpan ke `session.clientType`, jadi berguna untuk audit device/session.

Rekomendasi:

- React web: kirim `X-Client-Type: web`
- Expo iOS: kirim `X-Client-Type: ios`
- Expo Android: kirim `X-Client-Type: android`
- jika tidak ingin bedakan platform: `X-Client-Type: native`

## 5. Mode Auth yang Direkomendasikan

### 5.1 Web

Pakai cookie session.

Kenapa:

- paling cocok dengan Better Auth di browser
- `HttpOnly` cookie tidak perlu disimpan manual di local storage
- flow `useSession()` / `getSession()` lebih natural

Kebutuhan client:

- `credentials: "include"` atau `withCredentials: true`
- jika beda domain, origin frontend harus masuk trusted origins

### 5.2 Mobile Expo

Untuk repo ini, mode paling praktis adalah:

- login ke endpoint auth
- baca header `set-auth-token`
- simpan token ke secure storage
- kirim `Authorization: Bearer <token>` ke auth endpoint dan protected API lain

Kenapa ini paling praktis:

- repo ini sudah mengaktifkan plugin `bearer()`
- protected API internal (`/api/profile`, `/api/onboarding`, `/api/blogs`, dst) sudah mengubah bearer token menjadi cookie-compatible auth di server
- React Native tidak sefleksibel browser untuk cookie cross-origin manual

Jika nanti ingin full native Better Auth flow dengan cookie sync, `@better-auth/expo` bisa dipakai, tetapi saat ini plugin Expo belum dipasang di server repo ini.

## 6. Endpoint Auth yang Aktif dan Relevan

| Endpoint | Method | Untuk | Auth masuk | Catatan |
|---|---|---|---|---|
| `/api/auth/ok` | `GET` | health check auth | tidak | cocok untuk smoke test |
| `/api/auth/sign-up/email` | `POST` | register email/password | tidak | otomatis sign-in setelah register, karena `autoSignIn` default aktif |
| `/api/auth/sign-in/email` | `POST` | login email/password | tidak | sukses akan set cookie dan expose `set-auth-token` |
| `/api/auth/sign-out` | `POST` | logout current session | cookie atau bearer | hapus session aktif |
| `/api/auth/get-session` | `GET` | ambil current session | cookie atau bearer | endpoint paling stabil untuk source of truth session |

Endpoint Better Auth lain seperti password reset, email verification, social login, dan 2FA belum dijadikan kontrak utama di repo ini karena config pendukungnya belum dipasang.

## 7. Kontrak Respons yang Aman Dipakai Frontend

Ada dua jenis kontrak:

### 7.1 Kontrak transport

Ini yang paling stabil untuk `sign-up` dan `sign-in`:

- status `200` saat sukses
- cookie session diset oleh server
- header `set-auth-token` tersedia bila plugin bearer aktif

### 7.2 Kontrak data session

Untuk membaca user login saat ini, gunakan:

```text
GET /api/auth/get-session
```

Jangan jadikan body respons `sign-in` atau `sign-up` sebagai satu-satunya source of truth untuk state user. Setelah login/register sukses, langsung panggil `get-session`.

Itu pendekatan paling aman untuk web dan mobile.

## 8. Bentuk Data Session

Berikut bentuk session yang aman diasumsikan berdasarkan config Better Auth dan schema Prisma repo ini:

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

Catatan:

- `user.firstName`, `user.lastName`, `user.phoneNumber` adalah `additionalFields`
- `session.clientType` adalah `additionalFields`
- `role`, `banned`, `banReason`, `banExpires` datang dari plugin admin + schema user

## 9. OpenAPI / Swagger Ringkas

Snippet berikut bisa dijadikan dasar Swagger/OpenAPI untuk frontend integration.

```yaml
openapi: 3.0.3
info:
  title: Jimun Auth API
  version: 1.0.0
  description: |
    Kontrak auth aktif untuk integrasi web React dan React Native Expo.
    Flow yang direkomendasikan:
    - Web: cookie session
    - Mobile: bearer token dari header `set-auth-token`

servers:
  - url: /
    description: Same-origin API server

tags:
  - name: Auth

paths:
  /api/auth/ok:
    get:
      tags: [Auth]
      summary: Health check auth engine
      responses:
        "200":
          description: Better Auth route reachable
          content:
            application/json:
              schema:
                type: object
                additionalProperties: true

  /api/auth/sign-up/email:
    post:
      tags: [Auth]
      summary: Register user with email and password
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SignUpEmailRequest"
      responses:
        "200":
          description: |
            Register berhasil. Session cookie dibuat.
            Jika bearer plugin aktif, response header `set-auth-token` juga tersedia.
            Untuk membaca user/session canonical, panggil `/api/auth/get-session`.
          headers:
            set-auth-token:
              schema:
                type: string
              description: Session token untuk bearer auth mobile
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthMutationSuccess"
        "400":
          $ref: "#/components/responses/BadRequest"
        "409":
          $ref: "#/components/responses/Conflict"
        "422":
          $ref: "#/components/responses/ValidationError"

  /api/auth/sign-in/email:
    post:
      tags: [Auth]
      summary: Login user with email and password
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SignInEmailRequest"
      responses:
        "200":
          description: |
            Login berhasil. Session cookie dibuat.
            Jika bearer plugin aktif, response header `set-auth-token` juga tersedia.
            Untuk membaca user/session canonical, panggil `/api/auth/get-session`.
          headers:
            set-auth-token:
              schema:
                type: string
              description: Session token untuk bearer auth mobile
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthMutationSuccess"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "422":
          $ref: "#/components/responses/ValidationError"

  /api/auth/sign-out:
    post:
      tags: [Auth]
      summary: Logout current session
      security:
        - cookieAuth: []
        - bearerAuth: []
      responses:
        "200":
          description: Logout berhasil
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AuthMutationSuccess"
        "401":
          $ref: "#/components/responses/Unauthorized"

  /api/auth/get-session:
    get:
      tags: [Auth]
      summary: Get current authenticated session
      security:
        - cookieAuth: []
        - bearerAuth: []
      responses:
        "200":
          description: Session ditemukan atau null jika belum login
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: "#/components/schemas/SessionEnvelope"
                  - type: "null"
        "401":
          $ref: "#/components/responses/Unauthorized"

components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: better-auth.session_token
      description: Better Auth session cookie
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: Better Auth Session Token
      description: Session token yang didapat dari response header `set-auth-token`

  responses:
    BadRequest:
      description: Request body tidak valid
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/AuthError"
    Conflict:
      description: Konflik data, misalnya email sudah dipakai
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/AuthError"
    ValidationError:
      description: Validasi Better Auth gagal
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/AuthError"
    Unauthorized:
      description: Belum login atau token/session tidak valid
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/AuthError"

  schemas:
    SignUpEmailRequest:
      type: object
      required: [name, email, password]
      properties:
        name:
          type: string
          minLength: 2
          example: Jane Doe
        email:
          type: string
          format: email
          example: jane@example.com
        password:
          type: string
          minLength: 8
          example: supersecret123
        image:
          type: string
          nullable: true
          format: uri
        callbackURL:
          type: string
          nullable: true
          example: https://app.example.com/dashboard

    SignInEmailRequest:
      type: object
      required: [email, password]
      properties:
        email:
          type: string
          format: email
          example: jane@example.com
        password:
          type: string
          minLength: 8
          example: supersecret123
        rememberMe:
          type: boolean
          default: true
        callbackURL:
          type: string
          nullable: true
          example: https://app.example.com/dashboard

    AuthMutationSuccess:
      type: object
      additionalProperties: true
      description: |
        Better Auth dapat mengembalikan body implementasi-spesifik.
        Kontrak stabil untuk repo ini adalah:
        - status 200
        - cookie auth terset
        - optional header `set-auth-token`
        - ambil data user final lewat `/api/auth/get-session`

    SessionEnvelope:
      type: object
      required: [user, session]
      properties:
        user:
          $ref: "#/components/schemas/AuthUser"
        session:
          $ref: "#/components/schemas/AuthSession"

    AuthUser:
      type: object
      required:
        - id
        - name
        - email
        - emailVerified
        - createdAt
        - updatedAt
      properties:
        id:
          type: integer
          example: 12
        name:
          type: string
          example: Jane Doe
        firstName:
          type: string
          nullable: true
        lastName:
          type: string
          nullable: true
        email:
          type: string
          format: email
        phoneNumber:
          type: string
          nullable: true
        role:
          type: string
          nullable: true
          example: User
        banned:
          type: boolean
          nullable: true
          example: false
        banReason:
          type: string
          nullable: true
        banExpires:
          type: string
          format: date-time
          nullable: true
        emailVerified:
          type: boolean
          example: false
        image:
          type: string
          nullable: true
          format: uri
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    AuthSession:
      type: object
      required:
        - id
        - userId
        - expiresAt
        - createdAt
        - updatedAt
      properties:
        id:
          type: integer
          example: 31
        userId:
          type: integer
          example: 12
        expiresAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        ipAddress:
          type: string
          nullable: true
        userAgent:
          type: string
          nullable: true
        clientType:
          type: string
          nullable: true
          example: web
        impersonatedBy:
          type: string
          nullable: true

    AuthError:
      type: object
      properties:
        code:
          type: string
          nullable: true
          example: INVALID_EMAIL_OR_PASSWORD
        message:
          type: string
          nullable: true
          example: Invalid email or password
        error:
          type: string
          nullable: true
          example: Unauthorized
```

## 10. Detail Endpoint per Endpoint

### 10.1 `GET /api/auth/ok`

Tujuan:

- memastikan auth route hidup

Contoh:

```bash
curl -X GET https://api.example.com/api/auth/ok
```

Ekspektasi:

- `200 OK`
- body ringan dari Better Auth

### 10.2 `POST /api/auth/sign-up/email`

Dipakai untuk registrasi email/password.

Request body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "supersecret123"
}
```

Catatan implementasi repo:

- password minimum 8 karakter
- name minimum 2 karakter
- setelah signup berhasil, user otomatis login
- jika email ada di `BETTER_AUTH_ADMIN_EMAILS`, role user bisa langsung menjadi `Admin`

Respons sukses yang aman diasumsikan:

- `200 OK`
- cookie session dibuat
- header `set-auth-token` tersedia

Langkah frontend setelah sukses:

1. simpan `set-auth-token` jika client mobile
2. panggil `GET /api/auth/get-session`
3. pakai respons `get-session` sebagai state user final

Kemungkinan gagal:

- `409` atau `422` bila email sudah dipakai / payload tidak valid
- body error biasanya mengandung `message` dan kadang `code`

### 10.3 `POST /api/auth/sign-in/email`

Dipakai untuk login email/password.

Request body:

```json
{
  "email": "jane@example.com",
  "password": "supersecret123",
  "rememberMe": true
}
```

Respons sukses yang aman diasumsikan:

- `200 OK`
- cookie session dibuat
- header `set-auth-token` tersedia

Kemungkinan gagal:

- `401` kredensial salah
- `422` payload tidak valid

Frontend action setelah sukses:

1. web:
   - cukup lanjut panggil `GET /api/auth/get-session`
2. mobile:
   - ambil header `set-auth-token`
   - simpan ke secure storage
   - lanjut panggil `GET /api/auth/get-session` dengan bearer token

### 10.4 `POST /api/auth/sign-out`

Dipakai untuk logout session aktif.

Bisa dipanggil dengan:

- cookie
- bearer token

Contoh bearer:

```bash
curl -X POST https://api.example.com/api/auth/sign-out \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Ekspektasi:

- `200 OK`
- session aktif tidak bisa dipakai lagi
- mobile harus hapus token lokal dari secure storage

### 10.5 `GET /api/auth/get-session`

Ini endpoint terpenting untuk frontend.

Gunakan endpoint ini untuk:

- cek apakah user masih login
- ambil data user saat bootstrap app
- ambil source of truth setelah sign-in atau sign-up

Contoh cookie mode:

```bash
curl -X GET https://api.example.com/api/auth/get-session \
  --cookie "better-auth.session_token=YOUR_SESSION_TOKEN"
```

Contoh bearer mode:

```bash
curl -X GET https://api.example.com/api/auth/get-session \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Respons:

- jika login: object `{ user, session }`
- jika belum login: `null`

## 11. Implementasi React Web

### 11.1 Prinsip

Untuk web, gunakan cookie session dan `withCredentials`.

Kalau web app beda domain dengan API:

- origin web harus masuk ke trusted origins
- request harus membawa credential

### 11.2 Contoh client sederhana dengan `fetch`

```ts
const API_BASE = "https://api.example.com";

export async function signInEmail(input: { email: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "web"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      rememberMe: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? errorBody?.error ?? "Sign in failed");
  }

  return getSession();
}

export async function getSession() {
  const response = await fetch(`${API_BASE}/api/auth/get-session`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Client-Type": "web"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  return response.json();
}

export async function signOut() {
  const response = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Client-Type": "web"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to sign out");
  }
}
```

### 11.3 Kalau memakai Better Auth client di web

Pattern repo sekarang:

```ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  fetchOptions: {
    headers: {
      "X-Client-Type": "web"
    }
  }
});
```

Lalu:

```ts
await authClient.signIn.email({ email, password });
const { data: session } = await authClient.getSession();
await authClient.signOut();
```

## 12. Implementasi React Native Expo

### 12.1 Rekomendasi untuk repo ini

Untuk backend ini, pola termudah adalah:

1. login ke `/api/auth/sign-in/email`
2. baca header `set-auth-token`
3. simpan token ke `expo-secure-store`
4. kirim `Authorization: Bearer <token>` ke endpoint auth dan protected API

### 12.2 Kenapa bearer lebih cocok di sini

- repo ini sudah expose `set-auth-token`
- repo ini sudah menerima bearer token di protected API custom
- tidak tergantung manajemen cookie browser

### 12.3 Contoh util Expo

```ts
import * as SecureStore from "expo-secure-store";

const API_BASE = "https://api.example.com";
const TOKEN_KEY = "jimun.session-token";

export async function signInEmail(input: { email: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "native"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      rememberMe: true
    })
  });

  const errorBody = await response.clone().json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorBody?.message ?? errorBody?.error ?? "Sign in failed");
  }

  const token = response.headers.get("set-auth-token");

  if (!token) {
    throw new Error("Missing set-auth-token header");
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);

  return getSession();
}

export async function getSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_BASE}/api/auth/get-session`, {
    method: "GET",
    headers: {
      "X-Client-Type": "native",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  return response.json();
}

export async function signOut() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_BASE}/api/auth/sign-out`, {
    method: "POST",
    headers: {
      "X-Client-Type": "native",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  await SecureStore.deleteItemAsync(TOKEN_KEY);

  if (!response.ok) {
    throw new Error("Failed to sign out");
  }
}
```

### 12.4 Memakai token yang sama untuk protected API lain

Karena repo ini sudah support bearer auth di API custom, token yang sama bisa dipakai ke endpoint seperti:

- `/api/profile`
- `/api/onboarding`
- `/api/blogs`
- `/api/users`

Contoh:

```ts
export async function getProfile() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const response = await fetch(`${API_BASE}/api/profile`, {
    method: "GET",
    headers: {
      "X-Client-Type": "native",
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to fetch profile");
  }

  return response.json();
}
```

## 13. Status Code yang Perlu Ditangani Frontend

Minimum handling yang saya sarankan:

| Status | Arti | Tindakan frontend |
|---|---|---|
| `200` | sukses | lanjut refresh session / update UI |
| `400` | payload salah | tampilkan error form |
| `401` | belum login / password salah / token invalid | arahkan ke login atau minta login ulang |
| `403` | origin tidak diizinkan atau akses ditolak | cek trusted origins / role / onboarding |
| `409` | conflict, misalnya email sudah dipakai | tampilkan pesan spesifik |
| `422` | validasi Better Auth gagal | tampilkan pesan dari server |
| `500` | server error | tampilkan fallback error |

## 14. Endpoint yang Belum Layak Dipakai Frontend di Repo Ini

Jangan dulu dijadikan kontrak publik sampai config ditambahkan:

- email verification
- request password reset
- reset password
- social login
- Expo deep-link based auth flow
- 2FA

Alasannya:

- config `sendVerificationEmail` belum ada
- config `sendResetPassword` belum ada
- provider social belum ada
- plugin Expo server belum ada
- plugin 2FA belum ada

## 15. Rekomendasi Final untuk Tim Frontend

### Untuk React web

Pakai:

- cookie session
- `credentials: "include"`
- `X-Client-Type: web`
- `GET /api/auth/get-session` sebagai source of truth

### Untuk React Native Expo

Pakai:

- `POST /api/auth/sign-in/email`
- baca `set-auth-token`
- simpan di secure storage
- kirim `Authorization: Bearer <token>`
- `GET /api/auth/get-session` sebagai source of truth

### Flow standar yang aman

1. `sign-up` atau `sign-in`
2. jika sukses, ambil atau simpan token
3. panggil `get-session`
4. bootstrap state user dari respons `get-session`
5. gunakan token/cookie yang sama untuk endpoint bisnis lainnya
