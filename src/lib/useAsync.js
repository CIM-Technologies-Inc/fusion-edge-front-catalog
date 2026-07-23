import { useCallback, useEffect, useState } from 'react'

// Small fetch-state helper. Every page needs loading/error/data around a
// Supabase call; this keeps that boilerplate in one place.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    run()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [run])

  useEffect(() => reload(), [reload])

  return { ...state, reload }
}
