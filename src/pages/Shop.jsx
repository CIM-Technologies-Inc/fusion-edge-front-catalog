import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getProducts,
  getCategories,
  getFilterAttributes,
  getPriceBounds,
  formatPrice,
} from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import { SkeletonTiles } from '../components/Skeleton'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const slug = params.get('category')

  const { data: categories } = useAsync(() => getCategories(), [])
  const { data: filterAttrs } = useAsync(() => getFilterAttributes(), [])
  const { data: bounds } = useAsync(() => getPriceBounds(), [])
  const category = categories?.find((c) => c.slug === slug)

  // Filter state. Price is in cents; attrTerms maps attributeId -> [termId].
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [attrTerms, setAttrTerms] = useState({})

  // Seed the price inputs once the real bounds arrive (only if untouched).
  useEffect(() => {
    if (bounds && minPrice === '' && maxPrice === '') {
      setMinPrice(String(bounds.min))
      setMaxPrice(String(bounds.max))
    }
  }, [bounds]) // eslint-disable-line react-hooks/exhaustive-deps

  const minC = minPrice === '' ? undefined : Number(minPrice)
  const maxC = maxPrice === '' ? undefined : Number(maxPrice)

  // A stable key so the fetch re-runs when the attribute selection changes.
  const attrKey = JSON.stringify(attrTerms)

  const { data, loading, error } = useAsync(
    () =>
      getProducts({
        categoryId: category?.id,
        search: search.trim() || undefined,
        minPrice: minC,
        maxPrice: maxC,
        attributeTerms: attrTerms,
        limit: 100,
      }),
    [category?.id, slug, categories?.length, search, minC, maxC, attrKey]
  )
  const products = data ?? []

  const toggleTerm = (attrId, termId) =>
    setAttrTerms((prev) => {
      const cur = prev[attrId] ?? []
      const next = cur.includes(termId)
        ? cur.filter((t) => t !== termId)
        : [...cur, termId]
      const copy = { ...prev }
      if (next.length) copy[attrId] = next
      else delete copy[attrId]
      return copy
    })

  const activeCount = useMemo(() => {
    let n = 0
    if (search.trim()) n++
    if (slug) n++
    if (
      bounds &&
      (Number(minPrice) !== bounds.min || Number(maxPrice) !== bounds.max)
    )
      n++
    n += Object.values(attrTerms).filter((v) => v.length).length
    return n
  }, [search, slug, minPrice, maxPrice, attrTerms, bounds])

  const clearAll = () => {
    setSearch('')
    setAttrTerms({})
    if (bounds) {
      setMinPrice(String(bounds.min))
      setMaxPrice(String(bounds.max))
    }
    setParams({})
  }

  return (
    <section className="trending">
      <div className="shop-head">
        <h2>{category ? category.name : 'All Products'}</h2>
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setOpen(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
      </div>

      {loading && <SkeletonTiles count={8} />}
      {error && <p className="error">Couldn’t load products: {error.message}</p>}

      {!loading && !error && !products.length && (
        <p className="muted">
          No products match your filters.{' '}
          {activeCount > 0 && (
            <button type="button" className="linkish" onClick={clearAll}>
              Clear filters
            </button>
          )}
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
        <Link to="/">+ Back to Home</Link>
      </div>

      {/* Slide-in filter sidebar. */}
      <div className={open ? 'drawer-root filter-root open' : 'drawer-root filter-root'}>
        <div className="drawer-backdrop" onClick={() => setOpen(false)} />
        <aside className="filter-drawer" role="dialog" aria-label="Filters">
          <div className="drawer-head">
            <strong>Filters</strong>
            <button
              type="button"
              className="drawer-close"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="filter-body">
            {/* Search */}
            <div className="filter-group">
              <label className="filter-label" htmlFor="shop-search">
                Search
              </label>
              <input
                id="shop-search"
                type="search"
                className="filter-input"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Categories */}
            {Boolean(categories?.length) && (
              <div className="filter-group">
                <span className="filter-label">Category</span>
                <div className="filter-fills">
                  <button
                    type="button"
                    className={!slug ? 'fill on' : 'fill'}
                    aria-pressed={!slug}
                    onClick={() => setParams({})}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={slug === c.slug ? 'fill on' : 'fill'}
                      aria-pressed={slug === c.slug}
                      onClick={() => setParams({ category: c.slug })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price range */}
            {bounds && bounds.max > 0 && (
              <div className="filter-group">
                <span className="filter-label">Price</span>
                <div className="price-inputs">
                  <input
                    type="number"
                    className="filter-input"
                    min={bounds.min}
                    max={bounds.max}
                    value={minPrice === '' ? '' : Math.round(Number(minPrice) / 100)}
                    onChange={(e) =>
                      setMinPrice(String(Math.max(0, Number(e.target.value) * 100)))
                    }
                    aria-label="Minimum price"
                  />
                  <span className="price-dash">–</span>
                  <input
                    type="number"
                    className="filter-input"
                    min={bounds.min}
                    max={bounds.max}
                    value={maxPrice === '' ? '' : Math.round(Number(maxPrice) / 100)}
                    onChange={(e) =>
                      setMaxPrice(String(Math.max(0, Number(e.target.value) * 100)))
                    }
                    aria-label="Maximum price"
                  />
                </div>
                <input
                  type="range"
                  className="price-range"
                  min={bounds.min}
                  max={bounds.max}
                  step={100}
                  value={maxPrice === '' ? bounds.max : Number(maxPrice)}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  aria-label="Maximum price slider"
                />
                <p className="price-readout">
                  {formatPrice(Number(minPrice) || bounds.min)} –{' '}
                  {formatPrice(Number(maxPrice) || bounds.max)}
                </p>
              </div>
            )}

            {/* Attribute filters — toggle buttons (fills) per value. */}
            {(filterAttrs ?? []).map((attr) => (
              <div key={attr.id} className="filter-group">
                <span className="filter-label">{attr.name}</span>
                <div className="filter-fills">
                  {attr.terms.map((t) => {
                    const on = (attrTerms[attr.id] ?? []).includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={on ? 'fill on' : 'fill'}
                        aria-pressed={on}
                        onClick={() => toggleTerm(attr.id, t.id)}
                      >
                        {attr.display_type === 'color' && t.swatch && (
                          <span
                            className="swatch-dot"
                            style={{ background: t.swatch }}
                          />
                        )}
                        <span>{t.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="filter-foot">
            <button type="button" className="linkish" onClick={clearAll}>
              Clear all
            </button>
            <button
              type="button"
              className="filter-apply"
              onClick={() => setOpen(false)}
            >
              Show {products.length} result{products.length === 1 ? '' : 's'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  )
}
