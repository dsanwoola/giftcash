# Occasion.ng Firebase production status

Updated: 2026-07-11

## Current production target

Occasion.ng is Firebase-first.

- Project: `giftcash-d0f57`
- Firebase App Hosting backend: `giftcash`
- Region: `us-central1`
- Default App Hosting URL: `https://giftcash--giftcash-d0f57.us-central1.hosted.app`
- Custom domains:
  - `https://occasion.ng`
  - `https://www.occasion.ng`
- Server datastore: Firestore via Firebase Admin SDK

## Verified live routes

The following routes should return HTTP 200 from Firebase App Hosting:

- `/`
- `/launch`
- `/pricing`
- `/event/create`
- `/api/health`
- `/api/launch`

Expected `/api/health` shape:

```json
{
  "adminConfigured": true,
  "datastore": "firestore",
  "firestoreConfigured": true,
  "firestoreOk": true,
  "datastoreOk": true
}
```

## DNS

Both apex and `www` resolve to the Firebase App Hosting custom-domain IP:

| Host | Record |
| --- | --- |
| `occasion.ng` | `A 35.219.200.10` |
| `www.occasion.ng` | `A 35.219.200.10` |

Keep the Firebase certificate validation record required by App Hosting/Certificate Manager in DNS for renewal.

## Firebase-only repository policy

The repository should not contain runtime or deployment paths for other hosting providers. Keep:

- `apphosting.yaml`
- Firebase client/Admin SDK configuration
- Firestore-backed server routes
- Firebase deployment scripts/docs

Do not reintroduce non-Firebase deployment scripts, worker configs, or alternate datastore migrations unless a future migration is explicitly requested.

## Remaining launch blocker

The Firebase migration is complete, but live paid checkout remains blocked until payment provider secrets are configured in Firebase App Hosting.

Current payment variables needed for Paysure:

```text
PAYSURE_APP_ID
PAYSURE_PAYMENT_SECRET
PAYSURE_PUBLIC_KEY
PAYSURE_ENV
```

Webhook URLs:

```text
https://occasion.ng/api/payments/paysure/webhook
https://occasion.ng/api/payments/paystack/webhook
```
