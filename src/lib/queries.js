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

// Listing shape: enough to render a tile. Variations aren't fetched here —
// the price range on the product row is maintained by a trigger, so listings
// never need to join them.
const LIST_FIELDS = `
  id, name, slug, kind, price_cents, sale_price_cents, price_max_cents,
  in_stock, featured,
  images:product_images(url, alt, position, variation_id)
`

export async function getProducts({ categoryId, search, featured, limit = 24 } = {}) {
  let q = supabase
    .from('products')
    .select(LIST_FIELDS)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (categoryId) q = q.eq('category_id', categoryId)
  if (featured) q = q.eq('featured', true)
  if (search) q = q.ilike('name', `%${search}%`)

  return (unwrap(await q) ?? []).map(normalizeImages)
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
          terms:variation_terms(attribute_id, term_id)
        )
      `
      )
      .eq('slug', slug)
      .eq('published', true)
      .single()
  )

  return normalizeProduct(product)
}

// Postgrest returns nested rows in insertion order; sort and flatten here so
// components don't each re-implement it.
function normalizeImages(p) {
  const images = (p.images ?? []).sort((a, b) => a.position - b.position)
  return { ...p, images }
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
    currency: 'USD',
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
