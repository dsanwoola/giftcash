# Occasion.ng Firebase cutover

Generated: 2026-07-09

## Current target

Firebase App Hosting backend:

- Project: `giftcash-d0f57`
- Backend: `giftcash`
- Region: `us-central1`
- Default URL: `https://giftcash--giftcash-d0f57.us-central1.hosted.app`

## Verified on Firebase default URL

The following routes returned HTTP 200 after deployment:

- `/`
- `/event/create`
- `/api/health`
- `/pricing`

## Firebase custom domains created

Custom domains have been created on Firebase App Hosting for:

- `occasion.ng`
- `www.occasion.ng`

Firebase Auth authorized domains were also updated to include both domains.

## DNS records required at Hostinger

Move the domain DNS from Cloudflare to Hostinger first by changing nameservers at the registrar/Hostinger domain panel to Hostinger DNS, typically:

- `ns1.dns-parking.com`
- `ns2.dns-parking.com`

Then add these DNS records in Hostinger DNS Zone Editor.

### Apex `occasion.ng`

Remove Cloudflare A/AAAA records, then add:

| Type | Name/Host | Value |
| --- | --- | --- |
| A | `@` | `35.219.200.10` |
| TXT | `@` | `fah-claim=002-02-5277b9ce-2b4e-4200-ae51-e38eb56a56fa` |

### `www.occasion.ng`

Remove Cloudflare A/AAAA records, then add:

| Type | Name/Host | Value |
| --- | --- | --- |
| A | `www` | `35.219.200.10` |
| TXT | `www` | `fah-claim=002-02-6530d98f-9e82-4d14-814d-a81d8aa7dc1d` |

### SSL certificate verification

Add this CNAME and keep it permanently for certificate renewal:

| Type | Name/Host | Value |
| --- | --- | --- |
| CNAME | `_acme-challenge_gguz6lp36wrur55q` | `9d098a92-d024-49b0-b83c-f999cf8c0380.0.authorize.certificatemanager.goog` |

## Shut down Cloudflare

Only remove/disable the Cloudflare Worker/Pages app and Cloudflare DNS zone after:

1. `dig occasion.ng NS` no longer returns Cloudflare nameservers.
2. `dig occasion.ng A` returns `35.219.200.10`.
3. `dig www.occasion.ng A` returns `35.219.200.10`.
4. Firebase App Hosting domain status is connected/active for both domains.
5. `https://occasion.ng`, `https://www.occasion.ng`, and `/api/health` return HTTP 200 from Firebase.

Cloudflare CLI was not authenticated on the server at cutover time, so Cloudflare app shutdown requires Cloudflare dashboard/API access.
