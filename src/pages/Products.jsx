import { Link, useSearchParams } from 'react-router-dom'
import { getProducts } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import { SkeletonTiles } from '../components/Skeleton'

// The full catalogue, optionally filtered by a ?q= search term (from the
// header search). Shop (/shop) is the same grid with category chips.
export default function Products() {
  const [params] = useSearchParams()
  const query = (params.get('q') ?? '').trim()

  const { data, loading, error } = useAsync(
    () => getProducts({ search: query || undefined, limit: 100 }),
    [query]
  )
  const products = data ?? []

  return (
    <section className="trending fade-up">
      <h2>{query ? `Search: “${query}”` : 'All Products'}</h2>

      {loading && <SkeletonTiles count={8} />}
      {error && <p className="error">Couldn’t load products: {error.message}</p>}

      {!loading && !error && !products.length && (
        <p className="muted">
          {query ? (
            <>
              No products match “{query}”. <Link to="/products">Show all</Link>.
            </>
          ) : (
            <>
              No products yet. Add some from the Supabase dashboard (and set{' '}
              <code>published = true</code>).
            </>
          )}
        </p>
      )}

      {Boolean(products.length) && (
        <>
          <p className="sub">
            Showing {products.length} product{products.length === 1 ? '' : 's'}
            {query ? ` for “${query}”` : ''}.
          </p>
          <div className="tiles">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}

      <div className="see-all">
        <Link to="/shop">Browse by category →</Link>
      </div>
    </section>
  )
}
