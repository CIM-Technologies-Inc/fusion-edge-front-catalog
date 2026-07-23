// Brand lockup from public/logo.png. The tagline is baked into the artwork,
// so this is a single fixed image rather than composable text.
//
// The source art is dark-on-transparent, so on the dark footer it needs
// inverting — see `.logo-img.on-dark` in App.css.

export default function Logo({ className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Fusion Edge — Knowledge Flows. Intelligence Grows"
      className={`logo-img ${className}`}
      width="720"
      height="157"
    />
  )
}
