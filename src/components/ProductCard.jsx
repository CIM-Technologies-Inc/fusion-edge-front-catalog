import { Link } from 'react-router-dom'
import { formatPriceRange, imagesFor } from '../lib/queries'

export default function ProductCard({ product }) {
  const out = !product.in_stock
  const onSale = Boolean(product.sale_price_cents)
  const image = imagesFor(product, null)[0]

  return (
    <Link to={`/product/${product.slug}`} className="tile">
      <div className="tile-art">
        {onSale && <span className="flag-sale">SALE!</span>}
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
        {out && <span className="flag-out">⊘ OUT OF STOCK</span>}
      </div>
      <h3>{product.name}</h3>
      <p className="tile-price">{formatPriceRange(product)}</p>
    </Link>
  )
}
