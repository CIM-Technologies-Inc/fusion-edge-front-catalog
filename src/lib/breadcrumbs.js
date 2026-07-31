import { createContext, useContext, useEffect } from 'react'

// Lets a page supply a custom breadcrumb trail (e.g. a product's category)
// that the URL alone can't express. Layout renders one <Breadcrumbs>; a page
// calls useBreadcrumb(trail) to override the auto-derived trail.
export const BreadcrumbContext = createContext(null)

export function useBreadcrumb(items) {
  const setItems = useContext(BreadcrumbContext)
  useEffect(() => {
    setItems?.(items ?? null)
    return () => setItems?.(null)
    // Serialize items so an inline array doesn't re-run every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items ?? null)])
}
