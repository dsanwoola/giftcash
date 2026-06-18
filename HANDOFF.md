# GiftCash — Handoff

**For:** Chineye / Hermes  
**Date:** 2026-06-18  
**Status:** GitHub takeover complete; Firebase App Hosting account-side connection in progress.

---

## 1. Repeatable takeover process

This project follows the same handover pattern established with Bank Statement Auditor:

1. Deen provides the GitHub URL of a Claude-built app.
2. Chineye takes over the repo and makes GitHub the source of truth.
3. Chineye verifies the app locally and via GitHub CI.
4. Firebase is configured only after GitHub sync works.
5. Final deployment is verified against the live URL.

## 2. Project roots

```text
VPS clone: /root/projects/giftcash
GitHub:    https://github.com/dsanwoola/giftcash
Remote:    https://github.com/dsanwoola/giftcash.git
Branch:    main
```

A GitHub-to-VPS auto-sync cron job exists:

```text
GiftCash GitHub auto-sync
/root/.hermes/scripts/sync-giftcash.sh
schedule: every 10 minutes
```

## 3. How GiftCash differs from Bank Statement Auditor

Bank Statement Auditor is a static browser app and deploys with ordinary Firebase Hosting.

GiftCash is a Next.js app with SSR/API routes, so it should use Firebase App Hosting:

```text
Bank Statement Auditor → Firebase Hosting
GiftCash                → Firebase App Hosting
```

Do not add a normal Firebase Hosting live deploy workflow for GiftCash unless the app is deliberately converted to a static export. The `/api/*` routes and Admin SDK server operations require a server runtime.

## 4. Tech stack

```text
Next.js 16
React 19
TypeScript
Tailwind CSS
Firebase client SDK
Firebase Admin SDK
Firestore rules
```

Key commands:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

## 5. Firebase project

```text
Firebase project ID: giftcash-d0f57
Firebase config:    .firebaserc
Firestore rules:    firestore.rules
Rules deploy file:  firebase.json
App Hosting config: apphosting.yaml
```

The Firebase CLI rules deploy command is:

```bash
firebase deploy --only firestore:rules
```

or explicitly:

```bash
firebase deploy --only firestore:rules --project giftcash-d0f57
```

## 6. Firebase App Hosting setup

Expected Firebase Console setup:

```text
Project:    giftcash-d0f57
Repo:       dsanwoola/giftcash
Branch:     main
App root:   /
Backend:    GiftCash / giftcash
```

Production environment variables must be set in:

```text
Firebase Console → App Hosting → Backend → Settings → Environment
```

Public Web App variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

Server-only Admin SDK variables, preferred as one service-account JSON value:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Alternative split variables:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Never commit `.env.local`, service account JSON, private keys, or generated Firebase credentials.

## 7. GitHub Actions

Current workflow:

```text
.github/workflows/ci.yml
```

It runs on push/PR to `main`:

```bash
npm ci
npm run lint
npm run build
```

This matches the takeover standard: GitHub must prove the app builds before Firebase rollout is trusted.

## 8. Current verified state

Last verified GitHub commit:

```text
b0d110f Configure Firebase App Hosting
```

Verified checks:

```text
npm run lint:  passed
npm run build: passed
GitHub CI:     passed
```

CI run:

```text
https://github.com/dsanwoola/giftcash/actions/runs/27698472131
```

## 9. Current blocker

Firebase Console reported:

```text
We are waiting for permissions to propagate in order to create a valid connection. Please try again.
```

This happens before GiftCash code is built. It is an account/IAM/GitHub-connection propagation issue, not a code issue.

Recommended action:

1. Wait 5–15 minutes and retry.
2. Confirm Firebase project is on Blaze if App Hosting requires it.
3. Confirm Firebase/GitHub authorization can access `dsanwoola/giftcash`.
4. If still stuck, delete the partial backend connection and recreate it with repo `dsanwoola/giftcash`, branch `main`, app root `/`.

## 10. Secrets and private data

Tracked secret scan expectation:

```bash
git ls-files | grep -iE '(^|/)(\.env|.*secret.*|.*private.*|serviceAccount)' | grep -v '^\.env\.example$'
```

Expected result: no committed secrets. `.env.example` is placeholder-only and safe to commit.

## 11. Live verification checklist

When Firebase App Hosting provides the live URL:

1. Open the URL in a fresh browser.
2. Confirm landing page loads.
3. Confirm `/api/health` responds.
4. Confirm Firebase status/settings page no longer says demo mode after env vars are added.
5. Test register/login after Auth providers are enabled.
6. Test create gift flow.
7. Test dashboard/wallet flow only after Admin SDK env vars are present.
