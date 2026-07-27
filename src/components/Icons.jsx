// Inline stroke icons. Replaces the text glyphs (⌕ ☺ ⛁) that rendered
// inconsistently across platforms.

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function SearchIcon() {
  return (
    <svg {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  )
}

export function HeartIcon() {
  return (
    <svg {...base}>
      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7c0 4.9-7 9.3-7 9.3Z" />
    </svg>
  )
}

export function CartIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.6 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L21 7H6" />
    </svg>
  )
}

export function Caret() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="caret"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function Burger() {
  return (
    <svg {...base} width="18" height="18">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

export function Close() {
  return (
    <svg {...base} width="18" height="18">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
