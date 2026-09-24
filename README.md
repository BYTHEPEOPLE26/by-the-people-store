# By The People RolePlay — Store

A starter FiveM digital storefront for Businesses, Vehicles and MLOs with Stripe Checkout.

## Run locally

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Add your Stripe secret key.
4. Run:
   `npm install`
   `npm start`
5. Open `http://localhost:3000`.

## Stripe

Use a Stripe **test** secret key while developing. For production, set:
- `STRIPE_SECRET_KEY`
- `BASE_URL` to your public HTTPS domain.

The checkout session is created server-side, so the secret key is never placed in frontend JavaScript.

## Production additions

For a real store, connect Stripe webhooks to an order database and your FiveM/Discord fulfilment system. Do not treat the browser's success page alone as proof of payment; fulfil orders from a verified Stripe webhook.

Replace the demo products in `server.js` with your own products or move them into a database/admin panel.
