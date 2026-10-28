// Brand lockup from public/fusion-edgev2.png — the icon mark plus the
// "FUSION EDGE" wordmark, as a single fixed image rather than composable text.

export default function Logo({ className = '' }) {
  return (
    <img
      src="/fusion-edgev2.png"
      alt="Fusion Edge"
      className={`logo-img ${className}`}
      width="720"
      height="157"
    />
  )
}
