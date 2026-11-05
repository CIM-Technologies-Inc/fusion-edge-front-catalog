import { useEffect, useRef, useState } from 'react'

// Fades its children up into place the first time they scroll into view.
// Uses IntersectionObserver; once revealed it stops observing so the effect
// runs once (it doesn't re-hide on scroll back up).
//
// Honours prefers-reduced-motion: those users get the content shown
// immediately with no transform. Renders as a <div> by default; pass `as` to
// use a different element (e.g. `as="section"`).
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced motion or no observer support: show at once, skip the animation.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      // Trigger a little before the element is fully on screen.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const cls = ['reveal', shown ? 'is-in' : '', className].filter(Boolean).join(' ')

  return (
    <Tag ref={ref} className={cls} {...rest}>
      {children}
    </Tag>
  )
}
