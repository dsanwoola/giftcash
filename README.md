# Gift Cash 🎁

**Don't just send money. Send a moment.**

Gift Cash turns ordinary cash gifts into beautiful digital experiences for
birthdays, weddings, graduations, Valentine's Day, and every celebration that
matters. The recipient opens a *gift* — a personalised reveal ceremony where the
message comes before the money — not a cold bank transfer.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion**,
backed by **Firebase** (Auth + Firestore + Storage).

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs in **demo mode** out of the box — no backend required. All data
(gifts, wallet ledger, withdrawals) is seeded locally and persisted in
`localStorage`, so the entire journey works immediately:

- Landing page → `/`
- Live reveal demo → `/gift/tolu-birthday`
- Create a gift → `/gift/create`
- Dashboard / wallet / withdraw → `/dashboard`

> The wallet uses a real **append-only ledger** (`src/lib/data`) — balances are
> derived from credit/debit entries, never stored as a bare number.

---

## Going live with Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Add a **Web app** and copy the config into local `.env.local` for development
   and into **Firebase App Hosting → Backend → Settings → Environment** for
   production:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
   ```

3. **Authentication** → enable Email/Password, Google and Phone sign-in.
4. **Firestore** → create a database and deploy the rules in `firestore.rules`.
   The repo includes `firebase.json`, so the rules deploy command is:

   ```bash
   firebase deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
   ```

5. **Admin SDK** (for ledger-affecting ops) → Project settings → Service accounts
   → generate a key, and set the service-account JSON in App Hosting
   Environment. Never commit it to GitHub:

   ```
   FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"[REDACTED PRIVATE KEY]\\n"}
   ```

   Alternatively, split the same JSON into separate server-only variables:

   ```
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="[REDACTED PRIVATE KEY]\\n"
   ```

6. **App Hosting** → connect GitHub repo `dsanwoola/giftcash`, live branch `main`,
   app root `/`, then deploy. Runtime defaults live in `apphosting.yaml`.

`src/lib/firebase/client.ts` detects the public config automatically. Until it's
present, the app stays in demo mode — no code changes needed to switch.

### Data layer (how the swap works)
All UI imports `repo` from `src/lib/data/repo.ts`, which selects an implementation
of the shared **`GiftRepo`** contract (`repo-types.ts`) at runtime:

- **`demo-repo.ts`** — localStorage store (used until Firebase is configured).
- **`firestore-repo.ts`** — live Firebase. Reads + non-ledger writes (create
  group/event, append contributions) use the client SDK; **ledger-affecting
  writes** (fund gift, claim, withdrawals) call Admin-SDK API routes under
  `src/app/api/` so the append-only ledger stays server-authoritative (matching
  `firestore.rules`). Privileged logic lives in `src/lib/data/server-store.ts`
  and verifies the caller's Firebase ID token.

### Auth
`src/lib/auth/auth-context.tsx` provides `AuthProvider` + `useAuth`, dual-mode like
the data layer: a localStorage demo session until Firebase is configured, then
real Firebase Auth (email/password, Google, phone). Pages: `/login`, `/register`,
`/dashboard/settings`. On first sign-in the user's `profiles/{uid}` doc is created.

### Temporary bank-alert bridge before Paystack
Event gifts can use a semi-automatic GTBank transfer flow before Paystack is live:

1. Guest starts a bank-transfer payment on `/event/[slug]`.
2. API creates a `payment_intents/{GC...}` document and shows the exact amount,
   account, and narration/reference to use.
3. An email/SMS automation forwards GTBank credit alerts to
   `POST /api/payments/bank-alerts`.
4. The parser extracts amount, document number, description, value date, time and
   GiftCash reference. Exact reference + exact amount + GTBank sender auto-confirms.
5. Confirmed payments append the event contribution server-side, so the live party
   screen updates from Firestore. Imperfect matches go to review instead of
   showing publicly.

Production should set `BANK_ALERT_WEBHOOK_SECRET` and have the forwarding
workflow send it as `x-giftcash-bank-alert-secret`. The temporary settlement
account currently shown to guests is the approved GTBank account for Neighbours NG
Technologies.

> Remaining for full live mode: connect Paystack checkout/webhooks, add route
> guards where needed, and KYC actions.

---

## Architecture

```
src/
  app/                     # routes (App Router)
    page.tsx               # landing
    gift/create/           # 8-step create-gift wizard
    gift/[slug]/           # recipient reveal ceremony  ← the core experience
    dashboard/             # overview · wallet · withdraw
  components/
    reveal/                # reveal experience + theme-aware gift visual
    wizard/                # create-gift wizard
    dashboard/             # dashboard shell + nav
    ui/                    # button, logo
  lib/
    types.ts               # domain types + canonical statuses
    occasions.ts           # occasions + reveal themes catalog
    money.ts               # minor-unit money + service fee (revenue model)
    confetti.ts            # celebration / fireworks engines
    ai-messages.ts         # AI message assistant (swap-ready placeholder)
    data/                  # ledger-based data layer (demo store, Firebase-ready)
    firebase/              # Firebase client init
firestore.rules            # fintech-grade security rules
```

### Why Firestore
Fits Firebase, gives real-time message/contribution walls for free, and the
wallet ledger is enforced with Firestore transactions (append-only
`ledger_entries`, balance derived). The data layer (`src/lib/data`) is an
interface, so it can later move to Firebase Data Connect (Postgres) for strict
relational integrity without touching the UI.

---

## Roadmap

- **Phase 1 (done):** landing · create-gift wizard · reveal ceremony ·
  wallet ledger · claim · withdrawal request · dashboard · AI message assistant ·
  thank-you notes.
- **Phase 2 (done):** group gift pots (`/group`) · event/wedding QR pages
  (`/event`, sign-in-gated creation → multi-platform **share hub**: WhatsApp,
  SMS, email, Telegram, X, Facebook, native share, downloadable QR,
  add-to-calendar) · contribution walls · scheduled-delivery lock ·
  gifts-received keepsakes · **admin dashboard** (`/admin`: metrics, withdrawal
  approvals that reverse funds via the ledger, gifts, users/KYC) · **party
  big-screen mode** (`/event/[slug]/live`: real-time gift explosions with
  fanfare, confetti, scrolling leaderboard & live stats) + printable per-table
  QR codes (`/event/[slug]/tables`).
- **Phase 3:** live payment + bank-payout providers · KYC · fraud monitoring ·
  admin approval flows.
- **Phase 4:** merchant ecosystem (spend Gift Cash at partner stores).
