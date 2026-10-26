import { supabase } from './supabase'

// Data access lives here so components stay presentational. Every function
// throws on error; callers decide how to surface it.

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

export async function getCategories() {
  return unwrap(
    await supabase.from('categories').select('*').order('position').order('name')
  )
}

// Brands that have a logo — for the home-page marquee. Skips the placeholder
// "Generic" brand and any without a logo_url.
export async function getBrands() {
  return unwrap(
    await supabase
      .from('brands')
      .select('id, name, slug, logo_url')
      .not('logo_url', 'is', null)
      .order('position')
      .order('name')
  )
}

// Headline counts for the hero stat bar. Uses head+exact count so no rows are
// transferred — just the totals. Each count is independent; a failing one
// resolves to null so the bar can hide that single stat rather than erroring.
export async function getCatalogStats() {
  const count = async (table, apply = (q) => q) => {
    const { count, error } = await apply(
      supabase.from(table).select('*', { count: 'exact', head: true })
    )
    return error ? null : count
  }

  const [products, categories, brands] = await Promise.all([
    count('products', (q) => q.eq('published', true)),
    count('categories'),
    count('brands'),
  ])
  return { products, categories, brands }
}

// Listing shape: enough to render a tile. The price range on the product row
// is maintained by a trigger, so listings don't join variations for price —
// but stock is per-variation, so we pull just the variations' in_stock flags
// (nothing else) to know whether a variable product has any available option.
// product_attributes → term ids let us filter by attribute values client-side.
const LIST_FIELDS = `
  id, name, slug, kind, price_cents, sale_price_cents, price_max_cents,
  in_stock, featured,
  brand:brands(name),
  images:product_images(url, alt, position, variation_id),
  variations(in_stock),
  product_attributes(product_attribute_terms(term_id))
`

export async function getProducts({
  categoryId,
  search,
  featured,
  minPrice,
  maxPrice,
  // term ids grouped per attribute: { attributeId: [termId, …] }. A product
  // must match at least one term in EACH chosen attribute (AND across
  // attributes, OR within). Empty/omitted means no attribute filtering.
  attributeTerms,
  // 'newest' (default) or 'views' — the home "Most Viewed" section passes
  // 'views' to rank by all-time product-page views.
  orderBy = 'newest',
  limit = 24,
} = {}) {
  // Build the base query; `byViews` adds the view_count ordering. Kept as a
  // factory so we can retry ordered by newest if view_count isn't there yet
  // (the 0003 migration hasn't been run) — the feature degrades, nothing breaks.
  const build = (byViews) => {
    let q = supabase
      .from('products')
      .select(LIST_FIELDS)
      .eq('published', true)
      .limit(limit)
    q = byViews
      ? q.order('view_count', { ascending: false }).order('created_at', { ascending: false })
      : q.order('created_at', { ascending: false })
    if (categoryId) q = q.eq('category_id', categoryId)
    if (featured) q = q.eq('featured', true)
    if (search) q = q.ilike('name', `%${search}%`)
    return q
  }

  let res = await build(orderBy === 'views')
  // Fallback: a missing view_count column (migration not applied) → newest.
  if (res.error && orderBy === 'views') res = await build(false)

  let rows = (unwrap(res) ?? []).map(normalizeImages)

  // Price range (in cents) — filter on the price actually shown on the card:
  // its sale price when present, else its base price.
  const min = Number.isFinite(minPrice) ? minPrice : null
  const max = Number.isFinite(maxPrice) ? maxPrice : null
  if (min != null || max != null) {
    rows = rows.filter((p) => {
      const c = effectivePrice(p)
      if (c == null) return false
      if (min != null && c < min) return false
      if (max != null && c > max) return false
      return true
    })
  }

  // Attribute filters — each product carries a flat set of its term ids.
  const groups = Object.values(attributeTerms ?? {}).filter(
    (ids) => Array.isArray(ids) && ids.length > 0
  )
  if (groups.length > 0) {
    rows = rows.filter((p) => {
      const owned = new Set(
        (p.product_attributes ?? []).flatMap((pa) =>
          (pa.product_attribute_terms ?? []).map((t) => t.term_id)
        )
      )
      return groups.every((ids) => ids.some((id) => owned.has(id)))
    })
  }

  return rows
}

// Attributes flagged as storefront filters (admin sets `filterable`), with
// their available values — used to build the filter sidebar.
//
// Only GLOBAL (shared) values are offered, matching the admin Attributes page.
// Product-owned values (private to one product) are deliberately excluded so
// the filter stays a clean, curated list rather than every one-off value.
export async function getFilterAttributes() {
  const rows = unwrap(
    await supabase
      .from('attributes')
      .select(
        'id, name, slug, display_type, position, filterable, terms:attribute_terms(id, name, swatch, position, product_id)'
      )
      .eq('filterable', true)
      .is('attribute_terms.product_id', null)
      .order('position')
  )
  return (rows ?? [])
    .map((a) => ({
      ...a,
      terms: (a.terms ?? [])
        .filter((t) => t.product_id == null)
        .sort((x, y) => x.position - y.position),
    }))
    .filter((a) => a.terms.length > 0)
}

// Lowest and highest shown price (in cents) across published products, for the
// price-range slider's bounds. Falls back to a sane default if empty.
export async function getPriceBounds() {
  const rows = unwrap(
    await supabase
      .from('products')
      .select('price_cents, sale_price_cents')
      .eq('published', true)
  )
  const prices = (rows ?? [])
    .map((r) => r.sale_price_cents ?? r.price_cents)
    .filter((c) => c != null)
  if (!prices.length) return { min: 0, max: 0 }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

// Record a product-page view. Calls the secure SQL function (anon can't UPDATE
// products directly). Fire-and-forget: a failed view count must never break the
// page, so errors are swallowed.
export async function incrementProductView(productId) {
  if (!productId) return
  try {
    await supabase.rpc('increment_product_view', { p_id: productId })
  } catch {
    // ignore — view tracking is best-effort
  }
}

// Full product: attributes with their available terms, every variation with
// the terms that define it, and all images. One round trip.
export async function getProductBySlug(slug) {
  const product = unwrap(
    await supabase
      .from('products')
      .select(
        `
        *,
        category:categories(id, name, slug),
        brand:brands(id, name, slug),
        images:product_images(id, url, alt, position, variation_id),
        attributes:product_attributes(
          id, position, used_for_variations, default_term_id,
          attribute:attributes(id, name, slug, display_type, position),
          terms:product_attribute_terms(
            position,
            term:attribute_terms(id, name, slug, swatch, position)
          )
        ),
        variations(
          id, sku, price_cents, sale_price_cents, in_stock, position,
          terms:variation_terms(attribute_id, term_id),
          meta:variation_meta(name, value, position)
        )
      `
      )
      .eq('slug', slug)
      .eq('published', true)
      .single()
  )

  return normalizeProduct(product)
}

// variation_meta rows → ordered [{ name, values: [..] }], grouping rows that
// share a name and preserving position order.
function groupMeta(rows) {
  const byName = new Map()
  for (const row of (rows ?? []).slice().sort((a, b) => a.position - b.position)) {
    if (!byName.has(row.name)) byName.set(row.name, [])
    byName.get(row.name).push(row.value)
  }
  return [...byName].map(([name, values]) => ({ name, values }))
}

// Postgrest returns nested rows in insertion order; sort and flatten here so
// components don't each re-implement it. Also derive `available`: for a
// variable product, that's "any variation in stock"; for a simple product,
// its own in_stock flag. Cards read this instead of the bare parent flag,
// which on a variable product doesn't reflect its variations' stock.
function normalizeImages(p) {
  const images = (p.images ?? []).sort((a, b) => a.position - b.position)
  const available =
    p.kind === 'variable'
      ? (p.variations ?? []).some((v) => v.in_stock)
      : !!p.in_stock
  return { ...p, images, available }
}

function normalizeProduct(p) {
  const attributes = (p.attributes ?? [])
    .filter((pa) => pa.attribute)
    .sort((a, b) => a.position - b.position)
    .map((pa) => ({
      id: pa.id,
      usedForVariations: pa.used_for_variations,
      // The term preselected on the storefront (WooCommerce "default"); null
      // for no default.
      defaultTermId: pa.default_term_id ?? null,
      ...pa.attribute,
      terms: (pa.terms ?? [])
        .filter((t) => t.term)
        .map((t) => t.term)
        .sort((a, b) => a.position - b.position),
    }))

  const variations = (p.variations ?? [])
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      ...v,
      // { attributeId: termId } — the shape the picker compares against.
      termsByAttribute: Object.fromEntries(
        (v.terms ?? []).map((t) => [t.attribute_id, t.term_id])
      ),
      // Free-typed per-variation attributes, grouped { name: [values] }.
      // "Material: Oak, Teak" arrives as two rows sharing a name.
      meta: groupMeta(v.meta),
    }))

  return { ...normalizeImages(p), attributes, variations }
}

// Which variation matches the current picker selection? Returns null until
// every variation-forming attribute has been chosen.
export function findVariation(product, selection) {
  const required = product.attributes.filter((a) => a.usedForVariations)
  if (required.some((a) => !selection[a.id])) return null

  return (
    product.variations.find((v) =>
      required.every((a) => v.termsByAttribute[a.id] === selection[a.id])
    ) ?? null
  )
}

// Images scoped to a variation win; otherwise fall back to product-level.
export function imagesFor(product, variation) {
  if (!variation) return product.images.filter((i) => !i.variation_id)
  const own = product.images.filter((i) => i.variation_id === variation.id)
  return own.length ? own : product.images.filter((i) => !i.variation_id)
}

// The price actually charged: sale price when present.
export function effectivePrice(row) {
  return row?.sale_price_cents ?? row?.price_cents ?? null
}

// Other products in the same category. Excludes the one being viewed.
export async function getRelatedProducts(categoryId, excludeId, limit = 4) {
  if (!categoryId) return []
  const rows = unwrap(
    await supabase
      .from('products')
      .select(LIST_FIELDS)
      .eq('published', true)
      .eq('category_id', categoryId)
      .neq('id', excludeId)
      .limit(limit)
  )
  return (rows ?? []).map(normalizeImages)
}

// ------------------------------------------------------------------ library

export async function getSavedItems() {
  return unwrap(
    await supabase
      .from('saved_items')
      .select(
        `
        id, note, created_at, variation_id,
        product:products(
          id, name, slug, kind, price_cents, sale_price_cents,
          price_max_cents, in_stock,
          images:product_images(url, alt, position, variation_id)
        ),
        variation:variations(
          id, sku, price_cents, sale_price_cents, in_stock,
          terms:variation_terms(
            term:attribute_terms(name, slug),
            attribute:attributes(name, position)
          )
        )
      `
      )
      .order('created_at', { ascending: false })
  )
}

// Saves created today, one bucket per hour (0–23) in the browser's local
// time. RLS scopes saved_items to the current user, so this is "your saves
// today" — the only saved-item data the client key is allowed to read.
export async function getSavesByHourToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const rows = unwrap(
    await supabase
      .from('saved_items')
      .select('created_at')
      .gte('created_at', start.toISOString())
  )

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  for (const row of rows ?? []) {
    hours[new Date(row.created_at).getHours()].count += 1
  }
  return hours
}

export async function saveItem(productId, variationId = null) {
  const { data } = await supabase.auth.getUser()
  const userId = data?.user?.id
  if (!userId) throw new Error('Sign in to save items to your library.')

  return unwrap(
    await supabase
      .from('saved_items')
      .insert({
        user_id: userId,
        product_id: productId,
        variation_id: variationId,
      })
      .select()
      .single()
  )
}

export async function unsaveItem(savedItemId) {
  return unwrap(
    await supabase.from('saved_items').delete().eq('id', savedItemId)
  )
}

// Is this product (or variation) already in the library? Returns the saved
// row's id so the UI can toggle without a second lookup.
export async function findSavedItem(productId, variationId = null) {
  let q = supabase.from('saved_items').select('id').eq('product_id', productId)
  q = variationId ? q.eq('variation_id', variationId) : q.is('variation_id', null)
  return unwrap(await q.maybeSingle())
}

export function formatPrice(cents) {
  if (cents == null) return ''
  return (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'PHP',
  })
}

// Variable products show a span; a single price when both ends match.
export function formatPriceRange(product) {
  const from = effectivePrice(product)
  const to = product.price_max_cents
  if (from == null) return ''
  if (product.kind !== 'variable' || to == null || to === from) {
    return formatPrice(from)
  }
  return `${formatPrice(from)} – ${formatPrice(to)}`
}
