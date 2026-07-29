import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, signOut } from '../lib/auth'
import { getCategories } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import Logo from './Logo'
import { SearchIcon, UserIcon, HeartIcon, Caret, Burger, Close } from './Icons'

// Build the nav from a live category list. "Product" carries the categories as
// children: it still links to /products, and reveals a category dropdown.
// `to: null` renders a plain label for sections that have no page yet.
function useNavItems() {
  const { data: categories } = useAsync(() => getCategories(), [])
  const catChildren = (categories ?? []).map((c) => ({
    label: c.name,
    to: `/shop?category=${c.slug}`,
  }))

  return [
    { label: 'Home', to: '/', caret: true },
    { label: 'Shop', to: '/products', caret: true },
    { label: 'Category', to: '/shop', children: catChildren },
    { label: 'Contact', to: null },
  ]
}

// Desktop nav: a top-level item, plus a hover dropdown when it has children.
function DesktopNav({ items }) {
  return (
    <nav className="mainnav" aria-label="Primary">
      <ul>
        {items.map((item) => (
          <li key={item.label} className={item.children?.length ? 'has-menu' : ''}>
            {item.to ? (
              <NavLink to={item.to} end={item.to === '/'}>
                {item.label}
                {(item.caret || item.children?.length) && <Caret />}
              </NavLink>
            ) : (
              <span className="nav-static">{item.label}</span>
            )}

            {Boolean(item.children?.length) && (
              <ul className="submenu">
                {item.children.map((c) => (
                  <li key={c.to}>
                    <Link to={c.to}>{c.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Off-canvas navigation for small screens. Closes on link click, on Escape,
// on backdrop click; locks body scroll while open.
function MobileNav({ open, onClose }) {
  const { user } = useAuth()
  const location = useLocation()
  const items = useNavItems()

  // Route change closes the drawer (covers links, and back/forward).
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={open ? 'drawer-root open' : 'drawer-root'} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drawer-head">
          <Link to="/" className="logo" aria-label="Fusion Edge home" onClick={onClose}>
            <Logo />
          </Link>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close menu">
            <Close />
          </button>
        </div>

        <nav aria-label="Mobile">
          <ul className="drawer-nav">
            {items.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} end={item.to === '/'} onClick={onClose}>
                    {item.label}
                  </NavLink>
                ) : (
                  <span className="nav-static">{item.label}</span>
                )}

                {/* Categories expand inline beneath their parent. */}
                {Boolean(item.children?.length) && (
                  <ul className="drawer-subnav">
                    {item.children.map((c) => (
                      <li key={c.to}>
                        <Link to={c.to} onClick={onClose}>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="drawer-actions">
          <Link to="/library" onClick={onClose}>
            <HeartIcon /> Your library
          </Link>
          {user ? (
            <button type="button" onClick={() => { signOut(); onClose() }}>
              <UserIcon /> Sign out
            </button>
          ) : (
            <Link to="/signin" onClick={onClose}>
              <UserIcon /> Sign in
            </Link>
          )}
        </div>
      </aside>
    </div>
  )
}

// Header search: the icon opens a centred overlay with a large search bar.
// Submitting navigates to /products?q=<term>, where the Products page filters
// by name. Backdrop click / Escape closes; body scroll locks while open.
function SearchBox() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    navigate(`/products?q=${encodeURIComponent(q)}`)
    setOpen(false)
    setTerm('')
  }

  return (
    <>
      <button type="button" aria-label="Open search" onClick={() => setOpen(true)}>
        <SearchIcon />
      </button>

      <div
        className={open ? 'search-overlay open' : 'search-overlay'}
        aria-hidden={!open}
      >
        <div className="search-backdrop" onClick={() => setOpen(false)} />
        <form className="search-panel" onSubmit={submit} role="search">
          <span className="search-panel-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            tabIndex={open ? 0 : -1}
          />
          <button type="button" className="search-close" aria-label="Close search" onClick={() => setOpen(false)}>
            <Close />
          </button>
        </form>
      </div>
    </>
  )
}

function Header() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const items = useNavItems()

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="burger-btn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Burger />
        </button>

        <Link to="/" className="logo" aria-label="Fusion Edge home">
          <Logo />
        </Link>

        <DesktopNav items={items} />

        <div className="topbar-actions">
          <SearchBox />
          <Link to="/library" aria-label="Your library">
            <HeartIcon />
          </Link>
          {user ? (
            <button type="button" onClick={signOut} aria-label="Sign out">
              <UserIcon />
            </button>
          ) : (
            <Link to="/signin" aria-label="Account">
              <UserIcon />
            </Link>
          )}
        </div>
      </div>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="logo light" aria-label="Fusion Edge home">
          <Logo/>
        </Link>
        <address>
          706 SEDCCO 1 Building, 120 Rada cor. Legaspi St.,
          <br />
          Legaspi Village, Makati City
        </address>
        <address>
          907-723-4608
          <br />
          hello@fusionedge.com
        </address>
        <a href="#newsletter" className="newsletter">
          ✉ JOIN OUR NEWSLETTER.
        </a>
      </div>
      <div className="footer-bottom">
        <p>Copyright © 2026 Fusion Edge. All rights reserved.</p>
      </div>
    </footer>
  )
}

// Reset scroll to the top on navigation. A SPA keeps the previous scroll
// position, so following a link from mid-page lands you partway down the next
// one. Keyed on pathname only — a ?category= change on Shop is an in-page
// filter and shouldn't jump the view.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Floating button that appears once the page is scrolled down and smooth-
// scrolls back to the top. Present on every page via Layout.
function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      className={show ? 'back-to-top show' : 'back-to-top'}
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  )
}

// Floating Back + Refresh for the Revit WebView2 host, which has no browser
// chrome. Mobile-only (WebView2 renders at mobile width). Back hides when
// there's nothing in history to return to.
function WebViewNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [canGoBack, setCanGoBack] = useState(false)

  // history.length is unreliable across browsers, but within an SPA session we
  // can track our own depth: every push increases the router's history idx.
  useEffect(() => {
    const idx = window.history.state?.idx
    setCanGoBack(typeof idx === 'number' ? idx > 0 : window.history.length > 1)
  }, [location.key])

  return (
    <div className="webview-nav" aria-label="Page navigation">
      {canGoBack && (
        <button
          type="button"
          className="webview-btn"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="webview-btn"
        onClick={() => window.location.reload()}
        aria-label="Refresh page"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
        </svg>
      </button>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="site">
      <ScrollToTop />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WebViewNav />
      <BackToTop />
    </div>
  )
}
