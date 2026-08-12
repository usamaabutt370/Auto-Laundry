# Supabase

Migrations live in `migrations/`. Apply them from the **laundry-app** directory against **dev only** until production is ready:

```bash
cd laundry-app && npx supabase db push
```

`PROJECT_REF` is the **dev** project. Do not `db push` to live until you explicitly switch the project ref for a production release.

## If the project link is lost

From the **laundry-app** directory run:

```bash
supabase link --project-ref $(cat supabase/PROJECT_REF)
```

Log in when prompted. `PROJECT_REF` is committed so you don’t have to look up the project ID.

## Chat push notifications (FCM)

1. Apply migrations so `user_push_tokens` and `register_fcm_push_token` exist (`npx supabase db push`).
2. In the [Firebase console](https://console.firebase.google.com/), create or use a project, enable **Cloud Messaging**, add Android (`com.autolaundry.app`) and iOS (`com.autolaundry.app`) apps, and download `google-services.json` / `GoogleService-Info.plist` into the **laundry-app** root (see Expo + React Native Firebase docs). For iOS, upload your APNs key to Firebase.
3. Create a **service account** in Firebase (Project settings → Service accounts → **Generate new private key**). Save the downloaded JSON as **`laundry-app/credentials/firebase-service-account.json`** (gitignored).
4. Set Edge Function secrets (from **laundry-app**):

```bash
yarn supabase:secret:firebase
npx supabase secrets set CHAT_PUSH_WEBHOOK_SECRET='your-long-random-secret'
```

The first command reads `credentials/firebase-service-account.json` and uploads it as `FIREBASE_SERVICE_ACCOUNT_JSON`. Use the same webhook header value as `CHAT_PUSH_WEBHOOK_SECRET`. `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are injected automatically for functions.

5. Deploy the function (disable JWT verification so the **Database Webhook** can call it; auth is the shared `CHAT_PUSH_WEBHOOK_SECRET` header):

```bash
supabase functions deploy chat-message-push --no-verify-jwt
```

6. In the Supabase dashboard: **Database → Webhooks → Create a new hook**. Table `public.chat_messages`, event **INSERT**. URL:

`https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/chat-message-push`

Add HTTP header `x-chat-push-secret` with the same value as `CHAT_PUSH_WEBHOOK_SECRET`.

7. Build a **development or production native app** (`expo run:ios` / `expo run:android` or EAS). FCM does not run in Expo Go. After login, the app registers the device token via `register_fcm_push_token`.
