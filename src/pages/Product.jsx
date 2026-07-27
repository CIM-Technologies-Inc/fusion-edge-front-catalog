import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getProductBySlug,
  getRelatedProducts,
  findVariation,
  imagesFor,
  effectivePrice,
  formatPrice,
  formatPriceRange,
  saveItem,
  findSavedItem,
  unsaveItem,
} from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import { useAuth } from '../lib/auth'
import ProductCard from '../components/ProductCard'
import { SkeletonDetail, SkeletonTabs, SkeletonTiles } from '../components/Skeleton'

// One attribute's choices. Rendered as swatches, buttons, or a select
// depending on the attribute's display_type.
function AttributePicker({ attribute, value, onChange }) {
  const { display_type: type, terms } = attribute

  if (type === 'select') {
    return (
      <label className="picker">
        <span className="picker-label">{attribute.name}</span>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">Choose {attribute.name.toLowerCase()}…</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="picker">
      <span className="picker-label">
        {attribute.name}
        {value && (
          <em className="picker-value">
            {terms.find((t) => t.id === value)?.name}
          </em>
        )}
      </span>
      <div className={type === 'color' ? 'swatches' : 'chips'} role="group">
        {terms.map((t) => {
          const on = value === t.id
          // Clicking the selected term clears it, so a choice isn't a trap.
          const toggle = () => onChange(on ? null : t.id)

          return type === 'color' ? (
            <button
              key={t.id}
              type="button"
              className={on ? 'swatch on' : 'swatch'}
              style={{ background: t.swatch ?? '#ddd' }}
              onClick={toggle}
              aria-pressed={on}
              aria-label={t.name}
              title={t.name}
            />
          ) : (
            <button
              key={t.id}
              type="button"
              className={on ? 'chip on' : 'chip'}
              onClick={toggle}
              aria-pressed={on}
            >
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Project a product's attributes onto the gallery figure as data-* attributes,
// so a downstream script can read the product's configuration off the DOM.
//
// Naming (same for spec and variation attributes):
//   slug already "data-…"  → used as-is        data-cim-tile-w="600"
//   any other slug         → prefixed data-cim- finish → data-cim-finish
//
// Value depends on the attribute's role:
//   spec (used_for_variations = false)
//       all term *names*, comma-joined     data-cim-finish="Matte Charcoal,Satin"
//   variation (used_for_variations = true)
//       the *selected* term only, live      data-cim-color="#df2626"
//       — a term with a swatch contributes the swatch, plus a companion
//         data-cim-<slug>-name carrying the readable name:
//             data-cim-color="#df2626"  data-cim-color-name="Red Hearrt"
//       — a term without a swatch contributes its name      data-cim-liter="4L"
//       Omitted until that attribute is chosen.
//
// `selection` is { attributeId: termId } from the pickers. Passing it makes
// the variation values update as the shopper selects.
function dataAttributesFor(product, selection = {}) {
  const out = {}
  for (const attr of product.attributes) {
    if (!attr.terms.length) continue
    const name = attr.slug?.startsWith('data-') ? attr.slug : `data-cim-${attr.slug}`

    if (attr.usedForVariations) {
      const termId = selection[attr.id]
      if (!termId) continue // not chosen yet — no attribute emitted
      const term = attr.terms.find((t) => t.id === termId)
      if (!term) continue
      if (term.swatch) {
        out[name] = term.swatch
        out[`${name}-name`] = term.name
      } else {
        out[name] = term.name
      }
    } else {
      out[name] = attr.terms.map((t) => t.name).join(',')
    }
  }
  return out
}

// Main image with thumbnails beneath. A single image renders alone — one
// thumbnail under one photo is just noise.
function Gallery({ images, name, figureProps }) {
  const [index, setIndex] = useState(0)

  // Selecting a different variation swaps the image set, so an index held
  // from the previous set could point past the end. Clamp rather than store
  // a stale value.
  const safe = Math.min(index, Math.max(images.length - 1, 0))
  const main = images[safe]

  if (!images.length) {
    return (
      <div className="gallery">
        <figure className="gallery-main ct-media-container" {...figureProps}>
          <span className="art-empty large" aria-hidden="true" />
        </figure>
      </div>
    )
  }

  return (
    <div className="gallery">
      <figure className="gallery-main ct-media-container" {...figureProps}>
        <img src={main.url} alt={main.alt ?? name} />
      </figure>

      {images.length > 1 && (
        <ul className="gallery-thumbs">
          {images.map((img, i) => (
            <li key={img.id ?? img.url}>
              <button
                type="button"
                className={i === safe ? 'thumb on' : 'thumb'}
                onClick={() => setIndex(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-current={i === safe}
              >
                <img src={img.url} alt="" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Star rating. Reviews aren't stored yet, so this renders the empty state
// rather than a fabricated score — a fake rating would be a lie to shoppers.
function Stars({ value = 0, count = 0 }) {
  return (
    <p className="stars" aria-label={count ? `Rated ${value} of 5` : 'No reviews yet'}>
      <span className="stars-marks" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} className={n <= Math.round(value) ? 'star on' : 'star'}>
            ★
          </i>
        ))}
      </span>
      <span className="stars-count">
        {count ? `(${count} customer review${count === 1 ? '' : 's'})` : '(No reviews yet)'}
      </span>
    </p>
  )
}

// Currently unused — the share row is commented out in the product page.
// Kept so it can be re-enabled without rebuilding it.
// eslint-disable-next-line no-unused-vars
function ShareRow({ name }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = encodeURIComponent(name)
  const enc = encodeURIComponent(url)

  const links = [
    ['Facebook', 'f', `https://www.facebook.com/sharer/sharer.php?u=${enc}`],
    ['X', '𝕏', `https://twitter.com/intent/tweet?url=${enc}&text=${text}`],
    ['LinkedIn', 'in', `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`],
    ['Pinterest', 'P', `https://pinterest.com/pin/create/button/?url=${enc}&description=${text}`],
    ['Email', '✉', `mailto:?subject=${text}&body=${enc}`],
  ]

  return (
    <p className="share">
      <span className="share-label">Share on:</span>
      {links.map(([label, mark, href]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Share on ${label}`}
        >
          {mark}
        </a>
      ))}
    </p>
  )
}

// Description / Additional information / Reviews, as in the reference.
function Tabs({ product }) {
  const [tab, setTab] = useState('additional')

  // data-* attributes are configuration for the gallery figure, not shopper-
  // facing specs — keep them out of the Additional information table.
  const specs = product.attributes.filter(
    (a) => !a.usedForVariations && a.terms.length && !a.slug?.startsWith('data-')
  )

  // Additional information leads, so the default tab is also the leftmost —
  // a selected tab in the middle reads as if the first one was skipped.
  const tabs = [
    ['additional', 'Additional information'],
    ['description', 'Description'],
    ['reviews', 'Reviews (0)'],
  ]

  return (
    <section className="tabs fade-up">
      <div className="tablist" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={tab === id ? 'tab on' : 'tab'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="tabpanel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'description' && (
          <p>{product.description ?? 'No description provided.'}</p>
        )}

        {tab === 'additional' &&
          (specs.length ? (
            <dl className="specs-dl">
              {specs.map((a) => (
                <div className="spec-row" key={a.id}>
                  <dt>{a.name}</dt>
                  <dd>
                    {a.terms.map((t) => (
                      <span key={t.id} className="spec-value">
                        {t.swatch && (
                          <i className="spec-dot" style={{ background: t.swatch }} />
                        )}
                        {t.name}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">No additional information.</p>
          ))}

        {tab === 'reviews' && (
          <p className="muted">
            No reviews yet. Reviews aren’t implemented — there’s no reviews
            table in the database.
          </p>
        )}
      </div>
    </section>
  )
}

function Related({ categoryId, excludeId }) {
  const { data, loading } = useAsync(
    () => getRelatedProducts(categoryId, excludeId),
    [categoryId, excludeId]
  )
  const items = data ?? []

  // Hide the section entirely when there is nothing related, rather than
  // leaving an empty heading behind.
  if (!loading && !items.length) return null

  return (
    <section className="related fade-up">
      <h2>Related products</h2>
      {loading ? (
        <SkeletonTiles count={4} />
      ) : (
        <div className="tiles">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}

function SaveButton({ product, variation }) {
  const { user } = useAuth()
  const variationId = variation?.id ?? null

  const { data: saved, reload } = useAsync(
    () => (user ? findSavedItem(product.id, variationId) : Promise.resolve(null)),
    [user?.id, product.id, variationId]
  )

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  if (!user) {
    return (
      <p className="muted">
        <Link to="/signin">Sign in</Link> to save this to your library.
      </p>
    )
  }

  const toggle = async () => {
    setBusy(true)
    setErr(null)
    try {
      if (saved) await unsaveItem(saved.id)
      else await saveItem(product.id, variationId)
      reload()
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={saved ? 'btn-solid saved' : 'btn-solid'}
        onClick={toggle}
        disabled={busy}
      >
        {busy ? 'Saving…' : saved ? '♥ Saved to library' : '♡ Save to library'}
      </button>
      {err && <p className="error">{err.message}</p>}
    </>
  )
}

export default function Product() {
  const { slug } = useParams()
  const { data: product, loading, error } = useAsync(
    () => getProductBySlug(slug),
    [slug]
  )

  // { attributeId: termId }
  const [selection, setSelection] = useState({})

  // Preselect each variation attribute's default term once the product loads
  // (WooCommerce-style defaults). Keyed on product id so it runs once per
  // product, not on every render — the user's later picks are preserved.
  useEffect(() => {
    if (!product) return
    const defaults = {}
    for (const attr of product.attributes) {
      if (attr.usedForVariations && attr.defaultTermId) {
        defaults[attr.id] = attr.defaultTermId
      }
    }
    setSelection(defaults)
    // Intentionally keyed on product id alone: re-run only when a different
    // product loads, so the shopper's own picks aren't reset on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const variation = useMemo(
    () => (product ? findVariation(product, selection) : null),
    [product, selection]
  )

  const gallery = useMemo(
    () => (product ? imagesFor(product, variation) : []),
    [product, variation]
  )

  if (loading) {
    return (
      <>
        <SkeletonDetail />
        <SkeletonTabs />
      </>
    )
  }
  if (error) return <p className="error detail-msg">Product not found.</p>
  if (!product) return null

  const needsChoice = product.attributes.some(
    (a) => a.usedForVariations && !selection[a.id]
  )
  const active = variation ?? product
  const out = !active.in_stock

  return (
    <>
    <article className="detail">
      {/* The fade lives on this wrapper, not on Gallery itself: Gallery is
          keyed on the variation and remounts on every colour change, which
          would replay the animation each time it is clicked. */}
      <div className="fade-in">
        {/* Keyed on the variation so switching colours remounts the gallery
            and resets it to the first image of the new set. */}
        <Gallery
          key={variation?.id ?? 'default'}
          images={gallery}
          name={product.name}
          figureProps={dataAttributesFor(product, selection)}
        />
      </div>

      <div className="detail-body">
        <h1>{product.name}</h1>
        <Stars value={0} count={0} />

        <p className="detail-price">
          {variation ? (
            <>
              {variation.sale_price_cents && (
                <s className="was">{formatPrice(variation.price_cents)}</s>
              )}
              {formatPrice(effectivePrice(variation))}
            </>
          ) : (
            formatPriceRange(product)
          )}
        </p>

        {product.short_description && (
          <p className="detail-short">{product.short_description}</p>
        )}

        {/* Only variation-forming attributes are choices. The rest are
            descriptive specs and render as a table below. */}
        {product.attributes
          .filter((a) => a.usedForVariations)
          .map((a) => (
            <AttributePicker
              key={a.id}
              attribute={a}
              value={selection[a.id] ?? null}
              onChange={(termId) =>
                setSelection((s) => ({ ...s, [a.id]: termId }))
              }
            />
          ))}

        {/* Distinguish "haven't chosen yet" from "that combination doesn't
            exist" — otherwise an unavailable pairing looks like a bug. */}
        {needsChoice && product.kind === 'variable' && (
          <p className="muted">Select each option to see price and availability.</p>
        )}
        {!needsChoice && product.kind === 'variable' && !variation && (
          <p className="error">That combination isn’t available.</p>
        )}
        {out && <p className="error">Out of stock.</p>}

        <SaveButton product={product} variation={variation} />

        <dl className="detail-meta">
          {(variation?.sku ?? product.sku) && (
            <div>
              <dt>SKU:</dt>
              <dd>{variation?.sku ?? product.sku}</dd>
            </div>
          )}
          {product.category && (
            <div>
              <dt>Category:</dt>
              <dd>
                <Link to={`/shop?category=${product.category.slug}`}>
                  {product.category.name}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        {/* <ShareRow name={product.name} /> */}
      </div>
    </article>

      <Tabs product={product} />
      <Related categoryId={product.category_id} excludeId={product.id} />
    </>
  )
}
