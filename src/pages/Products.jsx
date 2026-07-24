import { Link } from 'react-router-dom'
import { getProducts } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import { SkeletonTiles } from '../components/Skeleton'

// The full catalogue, unfiltered. Shop (/shop) is the same grid with category
// chips; this is the plain "everything" list linked from the Product nav.
export default function Products() {
  const { data, loading, error } = useAsync(() => getProducts({ limit: 100 }), [])
  const products = data ?? []

  return (
    <section className="trending fade-up">
      <h2>All Products</h2>

      {loading && <SkeletonTiles count={8} />}
      {error && <p className="error">Couldn’t load products: {error.message}</p>}

      {!loading && !error && !products.length && (
        <p className="muted">
          No products yet. Add some from the Supabase dashboard (and set{' '}
          <code>published = true</code>).
        </p>
      )}

      {Boolean(products.length) && (
        <>
          <p className="sub">
            Showing {products.length} product{products.length === 1 ? '' : 's'}.
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
