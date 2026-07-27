import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
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
          <button type="button" aria-label="Search">
            <SearchIcon />
          </button>
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
          <Logo className="on-dark" />
        </Link>
        <address>
          2593 Timbercrest Road, Chisana, Alaska
          <br />
          United State
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

export default function Layout() {
  return (
    <div className="site">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
