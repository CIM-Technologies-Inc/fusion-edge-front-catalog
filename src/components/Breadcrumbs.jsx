import { Link, useLocation } from 'react-router-dom'

// Breadcrumb trail. Pass explicit `items` when a page has context the URL
// doesn't carry (e.g. a product's category); otherwise it derives a simple
// trail from the pathname. Renders nothing on the home page.
//
// items: [{ label, to? }] — the last item is the current page (no link).
const LABELS = {
  shop: 'Shop',
  products: 'All Products',
  product: 'Product',
  library: 'Library',
  dashboard: 'Dashboard',
  signin: 'Sign In',
}

export default function Breadcrumbs({ items }) {
  const { pathname } = useLocation()

  // Home: no breadcrumbs.
  if (pathname === '/') return null

  let trail = items
  if (!trail) {
    // Derive from the path: /products → Home / All Products
    const segs = pathname.split('/').filter(Boolean)
    trail = segs.map((seg, i) => ({
      label: LABELS[seg] ?? decodeURIComponent(seg),
      to: i < segs.length - 1 ? '/' + segs.slice(0, i + 1).join('/') : undefined,
    }))
  }

  const full = [{ label: 'Home', to: '/' }, ...trail]

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {full.map((item, i) => {
          const last = i === full.length - 1
          return (
            <li key={`${item.label}-${i}`}>
              {item.to && !last ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              )}
              {!last && <span className="crumb-sep" aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
