import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts, getCategories, formatPriceRange, imagesFor } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import {
  SkeletonHero,
  SkeletonTiles,
  SkeletonCategoryTiles,
} from '../components/Skeleton'

function Hero({ products, loading }) {
  const [active, setActive] = useState(0)

  // `products` here is already the featured list (fetched with featured:true),
  // so the carousel shows featured products only. No fallback: if nothing is
  // featured, the hero renders nothing.
  const slides = products.slice(0, 4)

  if (loading) return <SkeletonHero />
  if (!slides.length) return null

  const slide = slides[Math.min(active, slides.length - 1)]
  const image = imagesFor(slide, null)[0]

  return (
    <section className="hero">
      <div className="hero-copy fade-up">
        <p className="hero-no">{slide.sku ?? `No.${String(active + 1).padStart(3, '0')}`}</p>
        <h1 className="hero-title">{slide.name}</h1>
        <div className="hero-price">
          <span>{formatPriceRange(slide)}</span>
          <span className="vat">VAT included</span>
        </div>
        <p className="hero-dims">{slide.short_description ?? ''}</p>
        <Link to={`/product/${slide.slug}`} className="btn-outline">
          + Discover Now
        </Link>
      </div>

      <div className="hero-art fade-in">
        {image ? (
          <img src={image.url} alt={image.alt ?? slide.name} />
        ) : (
          <span className="art-empty" aria-hidden="true" />
        )}
      </div>

      {slides.length > 1 && (
        <div className="dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === active ? 'dot on' : 'dot'}
              aria-label={`Show ${s.name}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryTiles() {
  const { data: categories, loading } = useAsync(() => getCategories(), [])
  if (loading) return <SkeletonCategoryTiles />
  if (!categories?.length) return null

  return (
    <section className="cat-tiles">
      {categories.slice(0, 2).map((c) => (
        <Link to={`/shop?category=${c.slug}`} key={c.id} className="cat-tile fade-up">
          {/* No striped placeholder here: a category without a picture reads
              better as a plain panel than as a "missing image" box. */}
          {c.image_url && <img src={c.image_url} alt="" />}
          <div className="cat-meta">
            <h2>{c.name}</h2>
            <p>{c.description ?? ''}</p>
          </div>
        </Link>
      ))}
    </section>
  )
}

function Feature() {
  // Section disabled: the "Shell Chair Collection" copy is placeholder text
  // and the panel has no artwork. Delete the early return to restore it.
  return null

  // eslint-disable-next-line no-unreachable
  return (
    <section className="feature">
      <div className="feature-copy">
        <p className="eyebrow">#FURNITURES</p>
        <h2>Shell Chair Collection</h2>
        <p className="feature-text">
          Since 1991, Fusion Edge has been a purveyor of quality modern
          furniture. With 20 international brands and counting across 2 shops,
          we bring considered design to everyday living.
        </p>
        <Link to="/shop" className="btn-solid">
          Shop Now
        </Link>
      </div>
      <div className="feature-art">
        <span className="script">Crafted</span>
      </div>
    </section>
  )
}

function Trending({ products, loading, error }) {
  return (
    <section className="trending">
      <h2>Trending Products</h2>
      <p className="sub">
        Find a bright ideal to suit your taste with our great selection of
        suspension, wall, floor and table lights.
      </p>

      {loading && <SkeletonTiles count={4} />}
      {error && <p className="error">Couldn’t load products: {error.message}</p>}

      {!loading && !error && !products.length && (
        <p className="muted">
          No products yet. Add rows to the <code>products</code> table in
          Supabase (and set <code>published = true</code>) to see them here.
        </p>
      )}

      {Boolean(products.length) && (
        <div className="tiles">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <div className="see-all">
        <Link to="/shop">+ See All Products</Link>
      </div>
    </section>
  )
}

function SearchBar() {
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    const q = term.trim()
    if (q) navigate(`/products?q=${encodeURIComponent(q)}`)
  }

  return (
    <section className="searchbar">
      <form onSubmit={submit} role="search" aria-label="Product search">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Enter your keywords..."
          aria-label="Search products"
        />
        <button type="submit">⌕ SEARCH</button>
      </form>
    </section>
  )
}

export default function Home() {
  const { data, loading, error } = useAsync(() => getProducts({ limit: 12 }), [])
  const products = data ?? []

  // Featured products for the hero are fetched on their own so a featured
  // product is never missed just because it isn't among the newest 12.
  const { data: featuredData, loading: featuredLoading } = useAsync(
    () => getProducts({ featured: true, limit: 4 }),
    []
  )

  return (
    <>
      <Hero products={featuredData ?? []} loading={featuredLoading} />
      <CategoryTiles />
      <Feature />
      <Trending products={products} loading={loading} error={error} />
      <SearchBar />
    </>
  )
}
