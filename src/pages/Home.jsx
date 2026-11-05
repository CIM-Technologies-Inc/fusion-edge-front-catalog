import { Link } from 'react-router-dom'
import { getProducts, getCategories, getBrands, getCatalogStats } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
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

// Feature cards that straddle the bottom edge of the hero — icon, title and a
// short description, half over the image and half below it. The descriptions
// weave in live catalog counts from Supabase, falling back to neutral copy
// before the counts load (or if a count fails).
function HeroFeatures() {
  const { data: stats } = useAsync(() => getCatalogStats(), [])

  const items = [
    {
      // Grid of tiles — "browse the catalogue".
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
      title: 'Browse the catalog',
      text:
        stats?.products != null
          ? `${stats.products}+ products across ${stats.categories ?? 'every'} material categories.`
          : 'Paint, tile, flooring and more — all in one place.',
    },
    {
      // Ribbon/award — "trusted brands".
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="9" r="6" />
          <path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" />
        </svg>
      ),
      title: 'Trusted brands',
      text:
        stats?.brands != null
          ? `${stats.brands}+ brands you already specify, in one library.`
          : 'The brands you already specify, in one library.',
    },
    {
      // Cube dropping in — "drag into Revit".
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 7.5 12 2 3 7.5v9L12 22l9-5.5v-9Z" />
          <path d="M3 7.5 12 13l9-5.5M12 13v9" />
        </svg>
      ),
      title: 'Drag into Revit',
      text: 'Drop products straight into your model with specs attached.',
    },
  ]

  return (
    <ul className="hero-features" aria-label="Why Fusion Edge">
      {items.map((it) => (
        <li className="hero-feature" key={it.title}>
          <span className="hero-feature-icon" aria-hidden="true">{it.icon}</span>
          <div className="hero-feature-body">
            <h3>{it.title}</h3>
            <p>{it.text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// The differentiator: products drag straight into Revit with specs attached.
// A two-column band — copy on one side, a labelled drag illustration on the
// other — pointing at the catalog (and the plugin plans below).
function RevitShowcase() {
  const steps = [
    'Find a material in the catalog',
    'Drag it onto your Revit model',
    'Specs, finish and metadata ride along',
  ]

  return (
    <section className="revit-showcase">
      <div className="revit-showcase-inner">
        <div className="revit-showcase-copy">
          <p className="eyebrow">Revit plugin</p>
          <h2>From catalog to your model in one drag</h2>
          <p className="revit-showcase-text">
            No more hunting for specs or rebuilding materials by hand. Browse
            real products, drag them straight into Revit, and every finish,
            size and spec comes with them — ready to schedule.
          </p>
          <ol className="revit-steps">
            {steps.map((s, i) => (
              <li key={s}>
                <span className="revit-step-n">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="revit-showcase-actions">
            <Link to="/shop" className="btn-solid btn-solid-navy">
              Browse the catalog
            </Link>
            <a href="#plans" className="revit-showcase-link">
              See plugin plans →
            </a>
          </div>
        </div>

        {/* Lightweight illustration of the drag — no asset needed. A product
            "chip" arcs toward a Revit drop zone. */}
        <div className="revit-showcase-art" aria-hidden="true">
          <div className="revit-chip">
            <span className="revit-chip-swatch" />
            <span className="revit-chip-lines">
              <b />
              <i />
            </span>
          </div>
          <div className="revit-drop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7.5 12 2 3 7.5v9L12 22l9-5.5v-9Z" />
              <path d="M3 7.5 12 13l9-5.5M12 13v9" />
            </svg>
            <span>Drop into Revit</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// The three subscription plans, as a home-page preview. Mirrors the picker on
// /signin (same ids and access copy); each card links there to register. The
// bundle is flagged as the recommended option.
const HOME_PLANS = [
  {
    id: 'fusionedge',
    name: 'FusionEdge',
    access: 'Browse the catalog and drag materials into Revit.',
  },
  {
    id: 'bundle',
    name: 'FusionEdge + Plugin',
    access: 'Everything — palette drag plus the full plugin toolset.',
    featured: true,
  },
  {
    id: 'plugin',
    name: 'Revit Plugin',
    access: 'The in-Revit plugin tools, without the drag-in palette.',
  },
]

function PlansPreview() {
  return (
    <section className="plans-preview" id="plans">
      <h2>Pick the plan that fits how you work</h2>
      <p className="sub">
        Start specifying faster — choose a plan and create your account in
        minutes.
      </p>

      <div className="plan-cards">
        {HOME_PLANS.map((p) => (
          <div
            key={p.id}
            className={p.featured ? 'plan-preview-card is-featured' : 'plan-preview-card'}
          >
            {p.featured && <span className="plan-preview-flag">Most popular</span>}
            <h3>{p.name}</h3>
            <p className="plan-preview-access">{p.access}</p>
            <Link to="/signin" className="plan-preview-cta">
              Choose {p.name} →
            </Link>
          </div>
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
        The most-viewed products in our catalog — what architects and
        specifiers are looking at right now.
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

// Frequently asked questions, as a native <details> accordion — accessible and
// JS-free (one can be open at a time is not enforced; several can expand).
const FAQS = [
  {
    q: 'How do products get into Revit?',
    a: 'With the Fusion Edge plugin installed, you drag a material straight from the catalog palette onto your Revit model. The finish, size, manufacturer and spec metadata come attached — no manual rebuilding.',
  },
  {
    q: 'What is the difference between the plans?',
    a: 'FusionEdge gives you the catalog and the drag-into-Revit palette. Revit Plugin only unlocks the in-Revit plugin tools. The bundle includes both — the full workflow end to end.',
  },
  {
    q: 'Do I need a paid plan to browse?',
    a: 'No. You can browse the full catalog and product specs for free. A plan is needed to drag materials into Revit and to use the plugin tools.',
  },
  {
    q: 'Can I use Fusion Edge offline?',
    a: 'Yes. Once signed in, the plugin keeps working offline for a grace window so a dropped connection never stops your work; it re-checks your subscription when you are back online.',
  },
  {
    q: 'Which Revit versions are supported?',
    a: 'The plugin targets current Revit releases via WebView2. If you are unsure whether your version is covered, reach out and we will confirm before you subscribe.',
  },
]

function Faq() {
  return (
    <section className="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading">Frequently asked questions</h2>
      <p className="sub">
        Everything about the catalog, the Revit plugin and plans — in one place.
      </p>

      <div className="faq-list">
        {FAQS.map((item) => (
          <details className="faq-item" key={item.q}>
            <summary>
              {item.q}
              <span className="faq-mark" aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { data, loading, error } = useAsync(
    () => getProducts({ orderBy: 'views', limit: 8 }),
    []
  )
  const products = data ?? []

  return (
    <>
      <div className="home-hero-block">
        <VideoBand />
        {/* <BrandMarquee /> */}
      </div>
      <HeroFeatures />
      <Reveal><RevitShowcase /></Reveal>
      <Reveal><CategoryTiles /></Reveal>
      <Reveal><PlansPreview /></Reveal>
      <Reveal>
        <Trending products={products} loading={loading} error={error} />
      </Reveal>
      <Reveal><Faq /></Reveal>
    </>
  )
}
