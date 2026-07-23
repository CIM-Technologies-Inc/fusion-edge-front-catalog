# Fusion Edge

Ecommerce storefront built with React (Vite) and Supabase.

## Status

The UI is built and runs on demo data. **Supabase is not connected yet** — the
schema and queries are written but have never executed against a live database,
so expect small fixes on first connection.

| Area | State |
|---|---|
| Storefront UI | Working (home, shop, product, cart, checkout, orders, sign-in) |
| Catalog data | Demo array in `src/data/demoProducts.js` |
| Product images | CSS/SVG placeholders (`src/components/ProductArt.jsx`) |
| Database schema | Written, not yet run |
| Auth / cart / orders | Written, untested against a live project |
| Payments | Not implemented |

## Setup

```bash
npm install
npm run dev
```

The app runs without Supabase credentials and falls back to demo data.

To connect a real backend:

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/migrations/0001_init.sql`, then
   `0002_rls.sql`.
3. Copy `.env.example` to `.env` and fill in the project URL and anon key from
   **Settings → API**. Restart the dev server — Vite only reads env vars at
   startup.
4. Insert product rows, or the catalog will be empty.

Only the **anon** key belongs in `.env`. The service-role key bypasses row-level
security and must never reach the browser.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npx oxlint src` | Lint |
| `node check.mjs` | Load the running dev server in a real browser and assert the DOM rendered |

`check.mjs` exists because a passing build does not mean a working page — an
error at module load renders a blank screen while the build still succeeds. Run
it against `npm run dev` on port 5174.

## Layout

```
src/
  components/   Layout, Logo, Icons, ProductArt, ProductCard
  data/         demoProducts.js — placeholder catalog
  lib/          supabase.js, auth.js, useAuth.jsx, queries.js, useAsync.js
  pages/        Home, Shop, Product, Cart, Checkout, Orders, SignIn
supabase/
  migrations/   0001_init.sql (schema), 0002_rls.sql (row-level security)
```

## Notes

- **Prices are integer cents.** Floats lose precision on arithmetic.
- **Order items copy product name and price** rather than joining, so past
  orders stay accurate after a product is edited or deleted.
- **Checkout totals are computed in the browser.** Fine for a mock; a modified
  client could post any total. Before taking real payments this must move to a
  Postgres function or Edge Function that recomputes from the `products` table.
  See the comment in `src/lib/queries.js`.
- **Row-level security is enabled on every table.** The anon key ships in the
  browser bundle, so access rules have to live in the database, not in React.

## Known gaps

- Burger menu is a dead button; the mobile nav does not open.
- Nav dropdown carets are visual only.
- Product / Contact nav items have no pages and render as plain text.
- Product imagery is placeholder art, not photography.
