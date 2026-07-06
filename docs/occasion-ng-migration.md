# Occasion.ng Migration Notes

GiftCash is now positioned as the cash-gifting module inside the parent Occasion platform.

## Brand architecture

- Parent product: **Occasion.ng**
- Core promise: one link for invites, tickets, tables, gifts, RSVP and check-in.
- Gift module: **GiftCash** / **Occasion GiftCash**

## Cloudflare domain cutover checklist

1. Add `occasion.ng` as a Cloudflare zone, or change its nameservers at the registrar to Cloudflare's assigned nameservers.
2. After the GiftCash/Occasion Worker is deployed and verified, attach `occasion.ng` to the `giftcash` Worker/Pages deployment.
3. Keep the Firebase App Hosting URL active until the Cloudflare Worker passes production smoke tests.
4. Add these DNS records only after Cloudflare gives the exact target:
   - apex `occasion.ng` -> Cloudflare Worker custom domain
   - optional `www.occasion.ng` -> redirect or CNAME to apex
5. Verify:
   - `/`
   - `/event/create`
   - `/event/tunde-and-zainab`
   - `/api/health`
   - ticket/table module cards render

## Backend migration state

- Firebase Admin SDK has been removed from the Worker backend path.
- D1 schema exists for core GiftCash tables.
- D1 compatibility document store exists for interim server route migration.
- New D1 event commerce tables are in `migrations/0003_occasion_event_commerce.sql`.

## Next backend implementation slices

1. Apply D1 migrations remotely.
2. Deploy Worker to Cloudflare.
3. Add first-class D1 repositories for events, ticket types, tickets, guests, tables and check-in.
4. Add payment intents for ticket/table sales using the existing bank-alert + Paystack reconciliation foundation.
5. Add scanner/door-staff mode for `qr_code` validation.
