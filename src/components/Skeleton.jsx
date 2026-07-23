// Skeleton placeholders shown while data loads. They mirror the shape of the
// real content so the page doesn't jump when it arrives.
//
// Every skeleton is aria-hidden and sits inside a container marked
// aria-busy="true" — a screen reader should hear "loading", not a stack of
// meaningless empty boxes.

export function SkeletonLine({ w = '100%', h = '1em' }) {
  return <span className="sk sk-line" style={{ width: w, height: h }} />
}

// `h` is omitted when the height comes from CSS (e.g. an aspect-ratio box) —
// an inline height would otherwise override the stylesheet.
export function SkeletonBlock({ h, className = '' }) {
  return (
    <span
      className={`sk sk-block ${className}`}
      style={h ? { height: h } : undefined}
    />
  )
}

// One product tile: image area, name, price.
export function SkeletonTile() {
  return (
    <div className="tile sk-tile" aria-hidden="true">
      <div className="tile-art">
        <SkeletonBlock h="100%" />
      </div>
      <SkeletonLine w="70%" h="0.85rem" />
      <SkeletonLine w="40%" h="0.8rem" />
    </div>
  )
}

// A grid of tiles. `count` should match the page's usual result count so the
// layout settles at roughly the right height.
export function SkeletonTiles({ count = 4 }) {
  return (
    <div className="tiles" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  )
}

export function SkeletonHero() {
  return (
    <section className="hero" aria-busy="true" aria-label="Loading">
      <div className="hero-copy" aria-hidden="true">
        <SkeletonLine w="4rem" h="0.9rem" />
        <SkeletonLine w="80%" h="4rem" />
        <SkeletonLine w="12rem" h="1.4rem" />
        <SkeletonLine w="60%" h="0.8rem" />
        <SkeletonBlock h="2.9rem" className="sk-btn" />
      </div>
      <div className="hero-art" aria-hidden="true">
        <SkeletonBlock h="20rem" />
      </div>
    </section>
  )
}

export function SkeletonCategoryTiles({ count = 2 }) {
  return (
    <section className="cat-tiles" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: count }, (_, i) => (
        <div className="cat-tile" key={i} aria-hidden="true">
          <SkeletonLine w="6rem" h="1.1rem" />
          <SkeletonLine w="4rem" h="0.8rem" />
        </div>
      ))}
    </section>
  )
}

// Product detail: gallery on the left, title/price/options on the right.
export function SkeletonDetail() {
  return (
    <article className="detail" aria-busy="true" aria-label="Loading product">
      <div className="gallery" aria-hidden="true">
        {/* Height comes from the square aspect ratio in CSS, not a prop. */}
        <SkeletonBlock className="sk-gallery-main" />
        <div className="gallery-thumbs sk-thumbs">
          <SkeletonBlock className="sk-thumb" />
          <SkeletonBlock className="sk-thumb" />
          <SkeletonBlock className="sk-thumb" />
        </div>
      </div>

      <div className="detail-body" aria-hidden="true">
        <SkeletonLine w="65%" h="2.2rem" />
        <SkeletonLine w="9rem" h="0.85rem" />
        <SkeletonLine w="8rem" h="1.5rem" />
        <SkeletonLine w="90%" h="0.9rem" />
        <SkeletonLine w="75%" h="0.9rem" />

        <div className="sk-gap" />
        <SkeletonLine w="4rem" h="0.75rem" />
        <div className="swatches">
          <SkeletonBlock h="2rem" className="sk-swatch" />
          <SkeletonBlock h="2rem" className="sk-swatch" />
        </div>

        <div className="sk-gap" />
        <SkeletonBlock h="2.9rem" className="sk-btn" />
      </div>
    </article>
  )
}

// Description / Additional information / Reviews. The tab labels are static
// text, so they render for real — only the panel below is a placeholder.
//
// `rows` is how many spec rows to draw. The real count isn't known until the
// product loads, so this is a guess: too few and the page grows when data
// arrives, too many and it shrinks. Five is the middle of the range these
// products actually use.
export function SkeletonTabs({ rows = 5 }) {
  const widths = ['6rem', '4.5rem', '5.5rem', '7rem', '5rem']

  return (
    <section className="tabs" aria-busy="true" aria-label="Loading product details">
      <div className="tablist" aria-hidden="true">
        <span className="tab on">Additional information</span>
        <span className="tab">Description</span>
        <span className="tab">Reviews</span>
      </div>
      <div className="tabpanel" aria-hidden="true">
        <div className="specs-dl">
          {Array.from({ length: rows }, (_, i) => (
            <div className="spec-row sk-spec-row" key={i}>
              {/* Varied widths so the block doesn't read as a rigid table. */}
              <SkeletonLine w={widths[i % widths.length]} h="0.85rem" />
              <SkeletonLine w={i % 2 ? '9rem' : '12rem'} h="0.85rem" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SkeletonLibraryRows({ count = 3 }) {
  return (
    <ul className="saved-list" aria-busy="true" aria-label="Loading your library">
      {Array.from({ length: count }, (_, i) => (
        <li className="saved-row" key={i} aria-hidden="true">
          <span className="saved-art">
            <SkeletonBlock h="5rem" />
          </span>
          <div className="saved-meta">
            <SkeletonLine w="55%" h="1rem" />
            <SkeletonLine w="30%" h="0.8rem" />
          </div>
          <SkeletonLine w="4rem" h="0.9rem" />
          <SkeletonLine w="3.5rem" h="0.9rem" />
        </li>
      ))}
    </ul>
  )
}
