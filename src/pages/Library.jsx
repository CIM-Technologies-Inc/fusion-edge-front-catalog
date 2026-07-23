import { Link } from 'react-router-dom'
import {
  getSavedItems,
  unsaveItem,
  formatPrice,
  formatPriceRange,
  effectivePrice,
  imagesFor,
} from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import { useAuth } from '../lib/auth'
import { SkeletonLibraryRows } from '../components/Skeleton'

// "Oak / 180cm" from a saved variation's terms.
function variationLabel(variation) {
  if (!variation?.terms?.length) return null
  return variation.terms
    .filter((t) => t.term)
    .sort((a, b) => (a.attribute?.position ?? 0) - (b.attribute?.position ?? 0))
    .map((t) => t.term.name)
    .join(' / ')
}

function SavedRow({ item, onRemove }) {
  const { product, variation } = item
  if (!product) return null

  const image = imagesFor({ ...product, images: product.images ?? [] }, variation)[0]
  const label = variationLabel(variation)

  return (
    <li className="saved-row">
      <Link to={`/product/${product.slug}`} className="saved-art">
        {image ? (
          <img src={image.url} alt={image.alt ?? ''} loading="lazy" />
        ) : (
          <span className="art-empty" aria-hidden="true" />
        )}
      </Link>

      <div className="saved-meta">
        <Link to={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        {label && <p className="muted">{label}</p>}
        {item.note && <p className="saved-note">{item.note}</p>}
      </div>

      <p className="price">
        {variation
          ? formatPrice(effectivePrice(variation))
          : formatPriceRange(product)}
      </p>

      <button type="button" className="linklike" onClick={() => onRemove(item.id)}>
        Remove
      </button>
    </li>
  )
}

export default function Library() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => (user ? getSavedItems() : Promise.resolve([])),
    [user?.id]
  )

  const remove = async (id) => {
    await unsaveItem(id)
    reload()
  }

  if (authLoading) {
    return (
      <section className="library">
        <h1>Your library</h1>
        <SkeletonLibraryRows />
      </section>
    )
  }

  if (!user) {
    return (
      <section className="library">
        <h1>Your library</h1>
        <p className="muted">
          <Link to="/signin">Sign in</Link> to see the products you’ve saved.
        </p>
      </section>
    )
  }

  const items = data ?? []

  return (
    <section className="library">
      <h1>Your library</h1>

      {loading && <SkeletonLibraryRows />}
      {error && <p className="error">Couldn’t load your library: {error.message}</p>}

      {!loading && !error && !items.length && (
        <p className="muted">
          Nothing saved yet. Browse the <Link to="/shop">catalogue</Link> and
          save what you like.
        </p>
      )}

      {Boolean(items.length) && (
        <ul className="saved-list">
          {items.map((item) => (
            <SavedRow key={item.id} item={item} onRemove={remove} />
          ))}
        </ul>
      )}
    </section>
  )
}
