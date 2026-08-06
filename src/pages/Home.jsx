import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts, getCategories, getBrands } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import { SkeletonTiles, SkeletonCategoryTiles } from '../components/Skeleton'


function CategoryTiles() {
  const { data: categories, loading } = useAsync(() => getCategories(), [])
  if (loading) return <SkeletonCategoryTiles />
  if (!categories?.length) return null

  return (
    <section className="cat-tiles">
      {categories.slice(0, 3).map((c) => (
        <Link
          to={`/shop?category=${c.slug}`}
          key={c.id}
          className={c.image_url ? 'cat-tile has-image fade-up' : 'cat-tile fade-up'}
        >
          {c.image_url && (
            <img className="cat-bg" src={c.image_url} alt="" />
          )}
          <div className="cat-meta">
            <h2>{c.name}</h2>
            {c.description && <p>{c.description}</p>}
            <span className="cat-cta">Shop {c.name} →</span>
          </div>
        </Link>
      ))}
    </section>
  )
}

// Full-width band with a looping background video and overlaid copy.
// autoplay requires muted; playsInline keeps it inline on iOS instead of
// going fullscreen.
// Infinite brand-logo marquee. The track is rendered twice back-to-back and
// translated by -50%, so when the first copy scrolls off the second is already
// in place — a seamless loop with no jump.
function BrandMarquee() {
  const { data: brands } = useAsync(() => getBrands(), [])
  if (!brands?.length) return null

  const track = [...brands, ...brands]

  return (
    <section className="brand-marquee" aria-label="Brands we carry">
      <div className="brand-track">
        {track.map((brand, i) => (
          <span className="brand-logo" key={`${brand.id}-${i}`}>
            <img
              src={brand.logo_url}
              alt={brand.name}
              loading="lazy"
              aria-hidden={i >= brands.length}
            />
          </span>
        ))}
      </div>
    </section>
  )
}

function VideoBand() {
  return (
    <section className="video-band">
      <video
        className="video-band-media"
        src="https://txgxonwcdrxayurzjcwb.supabase.co/storage/v1/object/public/assets/cover-hero.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="video-band-inner">
        <p className="eyebrow">#FURNITURES</p>
        <h2>Crafted for modern living</h2>
        <p className="video-band-text">
          Since 1991, Fusion Edge has been a purveyor of quality modern
          furniture — considered design for everyday living.
        </p>
        <Link to="/shop" className="btn-solid">
          Shop Now
        </Link>
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

  return (
    <>
      <div className="home-hero-block">
        <VideoBand />
        <BrandMarquee />
      </div>
      <CategoryTiles />
      <Trending products={products} loading={loading} error={error} />
      <SearchBar />
    </>
  )
}
