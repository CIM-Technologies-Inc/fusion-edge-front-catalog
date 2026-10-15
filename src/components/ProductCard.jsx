import { Link } from 'react-router-dom'
import { formatPriceRange, imagesFor } from '../lib/queries'

export default function ProductCard({ product }) {
  // `available` is derived per-kind: for a variable product it's "any
  // variation in stock", so the flag reflects real availability, not the
  // parent row. Falls back to the parent flag if a caller didn't derive it.
  const out = product.available != null ? !product.available : !product.in_stock
  const onSale = Boolean(product.sale_price_cents)
  const image = imagesFor(product, null)[0]

  const maker = product.brand?.name

  return (
    <Link to={`/product/${product.slug}`} className="tile">
      <div className="tile-art">
        {onSale && <span className="flag-sale">Sale</span>}
        {image ? (
          <img
            src={image.url}
            alt={image.alt ?? ''}
            loading="lazy"
            // A dead URL would otherwise render as a broken-image icon; swap
            // in the neutral placeholder instead.
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.removeAttribute('hidden')
            }}
          />
        ) : null}
        <span className="art-empty" aria-hidden="true" hidden={Boolean(image)} />
        {out && <span className="flag-out">⊘ Out of stock</span>}
      </div>
      <div className="tile-body">
        {maker && <span className="tile-maker">{maker}</span>}
        <h3>{product.name}</h3>
        <p className="tile-price">{formatPriceRange(product)}</p>
      </div>
    </Link>
  )
}
