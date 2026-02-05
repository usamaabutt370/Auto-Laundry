# Developer A – Roadmap Before Auth Screens

Work that must be done **before** implementing phone login, OTP, and role selection screens.

---

## 1. Project verification

**Goal:** Confirm the app runs and is ready for new features.

- [ ] App runs without errors: `npx expo start` (iOS/Android/Web)
- [ ] No critical lint/TypeScript errors
- [ ] Decide and document: **Expo managed workflow** vs **prebuild / dev client** (e.g. if you need native modules later)

**Outcome:** Stable baseline to build on.

---

## 2. Environment and config

**Goal:** Keep API keys and env-specific values out of source code.

- [x] Add env loading (e.g. `expo-constants` + `app.config.js` with `extra`, or `react-native-dotenv` / `expo-env`)
- [x] Create `.env.example` with placeholders:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] Add `.env` to `.gitignore` (if not already)
- [x] Document in README how to get Supabase URL/anon key from Developer B

**Outcome:** Supabase URL and anon key can be injected per environment; no secrets in repo.

---

## 3. Supabase client

**Goal:** App can talk to Supabase for auth and (later) data.

- [x] Install: `@supabase/supabase-js`
- [x] Create a single Supabase client (e.g. `lib/supabase.ts` or `services/supabase.ts`) that uses env URL and anon key
- [x] Optional: create a typed auth helper (e.g. `getSession`, `onAuthStateChange`) so auth screens use one place for Supabase auth

**Outcome:** Ready to call Supabase auth (phone sign-in, verify OTP) from the app.

---

## 4. Navigation architecture

**Goal:** Clear structure for Auth vs Customer vs Partner, and correct redirects.

- [x] **Define route groups** (Expo Router):
  - `(auth)` – unauthenticated: phone input, OTP, role selection (no tabs)
  - `(customer)` – customer dashboard/tabs (home, orders, profile, etc.)
  - `(partner)` – partner dashboard/tabs (orders, earnings, profile, etc.)
- [x] **Root layout** (`app/_layout.tsx`):
  - Use auth state (see step 5): if no session → render `(auth)`, else → render role-based group `(customer)` or `(partner)`
  - Optional: use a “loading” screen or splash while resolving auth
- [x] **Redirect rules:**
  - Not logged in → `(auth)` (e.g. phone screen)
  - Logged in + role customer → `(customer)`
  - Logged in + role partner → `(partner)`
- [x] Move or replace current `(tabs)` so they become **customer** tabs or **partner** tabs inside the right group (not at root)

**Outcome:** One place that decides “auth vs customer vs partner”; auth screens will live inside `(auth)`.

---

## 5. Auth state foundation

**Goal:** Rest of the app knows “is user logged in?” and “what role?” without each screen calling Supabase directly.

- [x] Define **user role** type (e.g. `'customer' | 'partner'`) aligned with backend
- [x] Create **AuthContext** (or equivalent) that:
  - Exposes: `session`, `user`, `role`, `isLoading`, `isAuthenticated`
  - Subscribes to Supabase `onAuthStateChange`
  - Loads **role** after login (from Supabase: e.g. `profiles.role` or `partners` table) and exposes it
- [x] Wrap the app (e.g. in root `_layout.tsx`) with `AuthProvider`
- [x] Use this context in root layout to drive the navigation decision (step 4)

**Outcome:** After login, we have a single source of truth for session + role; navigation can route to the correct dashboard.

---

## 6. Types and constants

**Goal:** Shared types so auth and navigation stay consistent.

- [x] Add `types/user.ts` (or similar): e.g. `UserRole = 'customer' | 'partner'`, and any shared user/profile types you need
- [x] Add `constants/roles.ts` or include in existing constants: role labels, any role-based feature flags
- [x] Use these in AuthContext and in navigation redirect logic

**Outcome:** No magic strings; easy to extend for “admin” or other roles later if needed.

---

## 7. Placeholder auth routes (optional but recommended)

**Goal:** Navigation and auth state can be tested before UI is final.

- [x] Create minimal placeholder screens under `(auth)`:
  - e.g. `app/(auth)/phone.tsx` – “Phone screen (placeholder)”
  - e.g. `app/(auth)/otp.tsx` – “OTP screen (placeholder)”
  - e.g. `app/(auth)/role-select.tsx` – “Role select (placeholder)”
- [x] Wire (auth) stack in root layout so “not logged in” shows one of these (e.g. phone)
- [ ] Optionally add a dev-only “Skip to customer / Skip to partner” button that sets role and navigates, to test role-based dashboards without real OTP

**Outcome:** You can verify “not logged in → auth flow” and “logged in + role → correct dashboard” before polishing auth UI.

---

## Order of work (recommended)

1. **Project verification** (1)  
2. **Environment and config** (2)  
3. **Supabase client** (3)  
4. **Types and constants** (6)  
5. **Auth state foundation** (5)  
6. **Navigation architecture** (4)  
7. **Placeholder auth routes** (7)  

Then: **implement real auth screens** (phone input, OTP verification, role selection) and connect them to Supabase and AuthContext.

---

## Checklist summary

| # | Task block              | Done |
|---|-------------------------|------|
| 1 | Project verification    | ☑    |
| 2 | Environment and config  | ☑    |
| 3 | Supabase client         | ☑    |
| 4 | Navigation architecture| ☑    |
| 5 | Auth state foundation  | ☑    |
| 6 | Types and constants    | ☑    |
| 7 | Placeholder auth routes| ☑    |

After all are done, you’re ready to build the real auth screens (Week 1 deliverable).
