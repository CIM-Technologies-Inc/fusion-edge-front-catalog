import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth, signOut } from '../lib/auth'
import Logo from './Logo'
import { SearchIcon, UserIcon, HeartIcon, Caret } from './Icons'

// `to` is null for sections that have no page yet — those render as plain
// labels so the nav never links somewhere broken.
const navItems = [
  { label: 'Home', to: '/', caret: true },
  { label: 'Shop', to: '/shop', caret: true },
  { label: 'Product', to: null, caret: true },
  { label: 'Contact', to: null, caret: false },
]

function Header() {
  const { user } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="logo" aria-label="Fusion Edge home">
          <Logo />
        </Link>

        <nav className="mainnav" aria-label="Primary">
          <ul>
            {navItems.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} end={item.to === '/'}>
                    {item.label}
                    {item.caret && <Caret />}
                  </NavLink>
                ) : (
                  <span className="nav-static">
                    {item.label}
                    {item.caret && <Caret />}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

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
