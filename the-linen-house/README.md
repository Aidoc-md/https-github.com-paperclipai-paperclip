# The Linen House

An online store for a linen clothing brand, built with Node.js and Express. It has a dusty pink and charcoal theme, serif headings, and Razorpay checkout.

## Pages

| Route | What's there |
| --- | --- |
| `/` | Hero banner, category grid, bestsellers in a sideways-scrolling row (price, rating, Add to cart), brand story, customer reviews, newsletter |
| `/shop` | Product grid with filters: `?category=women\|men\|fabrics\|accessories`, `?filter=new`, `?filter=wishlist`, `?q=search` |
| `/product/:id` | Product page: image gallery, colour and size pickers, quantity, wishlist, Buy now, related products |
| `/cart` | Change quantities, remove items, progress bar toward free shipping, order summary |
| `/checkout` | Contact and shipping form, then Razorpay payment |
| `/order-success` | Order confirmation |
| `/account` | Past orders and saved details (kept in the browser) |

The header (logo on the left, menu in the middle, search, wishlist, cart and account icons on the right) and the pink footer (FAQs, contact, address) appear on every page.

## Run it

```bash
npm install
cp .env.example .env    # add your Razorpay keys (optional)
npm start               # http://localhost:3000
```

**Demo mode:** if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are not set, checkout fakes the payment so you can test the whole flow. Use **test** keys (`rzp_test_…`) while developing.

## How payment works

1. The browser sends the cart (product ids and quantities only) and the customer's details to `POST /api/checkout/create-order`.
2. The server works out the prices from its own catalogue, so a shopper can't change the price in the browser. It then creates a Razorpay order in paise.
3. Razorpay Checkout opens with that `order_id`.
4. When the payment goes through, the browser sends `razorpay_order_id`, `razorpay_payment_id` and `razorpay_signature` to `POST /api/checkout/verify`. The server checks the HMAC-SHA256 signature before marking the order paid.

## Before going live

- Orders are stored in memory and are lost when the server restarts. Use a database (Postgres, MongoDB and so on).
- Add a Razorpay webhook (`payment.captured`) as a backup confirmation.
- Accounts and order history are kept in the browser's localStorage. Add real login if you need it.
- Product images load from Unsplash's CDN (`images.unsplash.com`). Replace them with your own product photos. If an image fails to load, a soft pink tile is shown in its place.
- Edit products in `data/products.js`. Prices are in INR.
