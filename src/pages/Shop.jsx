import { Link, useSearchParams } from 'react-router-dom'
import { getProducts, getCategories } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import { SkeletonTiles } from '../components/Skeleton'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const slug = params.get('category')

  const { data: categories } = useAsync(() => getCategories(), [])
  const category = categories?.find((c) => c.slug === slug)

  const { data, loading, error } = useAsync(
    () => getProducts({ categoryId: category?.id, limit: 60 }),
    // Wait for categories before filtering, or the first fetch ignores ?category.
    [category?.id, slug, categories?.length]
  )
  const products = data ?? []

  return (
    <section className="trending">
      <h2>{category ? category.name : 'All Products'}</h2>

      {Boolean(categories?.length) && (
        <div className="cat-filter">
          <button
            type="button"
            className={!slug ? 'chip on' : 'chip'}
            onClick={() => setParams({})}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={slug === c.slug ? 'chip on' : 'chip'}
              onClick={() => setParams({ category: c.slug })}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading && <SkeletonTiles count={8} />}
      {error && <p className="error">Couldn’t load products: {error.message}</p>}

      {!loading && !error && !products.length && (
        <p className="muted">No products found.</p>
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
        <Link to="/">+ Back to Home</Link>
      </div>
    </section>
  )
}
