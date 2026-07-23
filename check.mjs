// Loads the running dev server in a real browser and asserts the DOM actually
// populated. A 200 status only proves Vite served HTML; this proves React ran.
import { chromium } from 'playwright'

const OUT =
  'C:/Users/JOHNPA~1/AppData/Local/Temp/claude/c--Users-JohnPatrickAnonuevo-Desktop-my-project-react-fusion/d79f968c-0bd3-4f7b-8d94-ceabb703bde8/scratchpad'

const b = await chromium.launch()
const p = await b.newPage()
const errs = []
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text())
})
p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))

// Vite picks the next free port when one is taken, so allow an override:
//   node check.mjs 5175   (or PORT=5175 node check.mjs)
const port = process.argv[2] || process.env.PORT || 5173
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })

console.log(
  '#root innerHTML length:',
  await p.$eval('#root', (el) => el.innerHTML.length)
)

for (const t of ['Trending Products', 'Shell Chair Collection']) {
  const hit = (await p.locator(`text=${t}`).count()) > 0
  console.log((hit ? 'ok   ' : 'MISS ') + t)
}

// Products now come from Supabase. Either tiles render, or the empty state
// explains why — a blank section with neither would be the real failure.
const tiles = await p.locator('.tile').count()
const empty = await p.locator('text=No products yet').count()
console.log(
  tiles > 0
    ? `ok   ${tiles} product tile(s) from Supabase`
    : empty > 0
      ? 'ok   empty state shown (database has no published products)'
      : 'FAIL no tiles and no empty state'
)

// The wordmark is an image, so assert the files actually loaded rather than
// searching for text. naturalWidth === 0 means a broken src.
const logos = await p.locator('.logo-img').all()
console.log('logo images found:', logos.length)
for (const l of logos) {
  const { w, h, src } = await l.evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
    src: el.getAttribute('src'),
  }))
  console.log((w > 0 ? 'ok   loaded ' : 'BROKEN ') + `${src} (${w}x${h})`)
}

// Old brand must be fully gone.
for (const t of ['AUROS', 'Auros', 'Opal_WP']) {
  const gone = (await p.locator(`text=${t}`).count()) === 0
  console.log((gone ? 'ok   gone: ' : 'STALE ') + t)
}

// Favicon: the <link> must point at the brand icon and actually resolve.
const iconHref = await p.locator('link[rel="icon"]').getAttribute('href')
const iconRes = await p.request.get(new URL(iconHref, p.url()).href)
console.log(
  `favicon ${iconHref}: HTTP ${iconRes.status()} ` +
    `${iconRes.headers()['content-type']} ${(await iconRes.body()).length}b`
)
console.log('page title:', await p.title())

// Nav row: labels present, and the active item underlined.
const labels = await p.locator('.mainnav li').allTextContents()
console.log('nav items:', labels.map((s) => s.trim()).join(' | '))
console.log('active nav item:', await p.locator('.mainnav a.active').innerText())

console.log('tiles rendered:', await p.locator('.tile').count())
console.log('console errors:', errs.length ? errs.slice(0, 5) : 'none')

await p.locator('.topbar').screenshot({ path: `${OUT}/header.png` })
await p.locator('.footer').screenshot({ path: `${OUT}/footer.png` })
await p.screenshot({ path: `${OUT}/home.png`, fullPage: true })
await b.close()
