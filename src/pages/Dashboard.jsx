import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSavesByHourToday, getMySubscription } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import { useAuth, simulateSubscribe } from '../lib/auth'
import { useToast } from '../lib/toast'

// SIMULATION ONLY — same plans as the signup picker. Remove the switch controls
// (and simulateSubscribe) when real checkout ships; the display can stay.
const PLANS = [
  { id: 'fusionedge', name: 'FusionEdge only' },
  { id: 'plugin', name: 'Revit Plugin only' },
  { id: 'bundle', name: 'FusionEdge + Plugin' },
]

// Current plan + the ability to switch it (simulation). Reads the user's
// subscription on mount and after a change, so the plan shown is always fresh.
function PlanCard() {
  const toast = useToast()
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(null)
  const { data: sub, loading } = useAsync(() => getMySubscription(), [reloadKey])

  const currentId = sub?.plan?.id ?? sub?.plan_id ?? null
  const currentName =
    sub?.plan?.name ?? PLANS.find((p) => p.id === currentId)?.name ?? null

  async function choose(planId) {
    if (planId === currentId || busy) return
    setBusy(planId)
    const { error } = await simulateSubscribe(planId)
    setBusy(null)
    if (error) return toast.error(error.message)
    toast.success(
      `Plan updated to ${PLANS.find((p) => p.id === planId)?.name}.`
    )
    setReloadKey((k) => k + 1) // re-read so the card reflects the new plan
  }

  return (
    <div className="plan-card">
      <div className="plan-card-head">
        <span className="stat-label">Your plan</span>
        {loading ? (
          <strong className="plan-current">—</strong>
        ) : currentName ? (
          <strong className="plan-current">
            {currentName}
            {sub?.status && sub.status !== 'active' && (
              <span className="plan-status"> · {sub.status}</span>
            )}
          </strong>
        ) : (
          <strong className="plan-current plan-none">No active plan</strong>
        )}
      </div>

      <p className="plan-hint">Switch plan (simulation — no payment):</p>
      <div className="plan-switch">
        {PLANS.map((p) => {
          const on = p.id === currentId
          return (
            <button
              key={p.id}
              type="button"
              className={on ? 'plan-pill on' : 'plan-pill'}
              aria-pressed={on}
              disabled={busy !== null}
              onClick={() => choose(p.id)}
            >
              {busy === p.id ? 'Updating…' : p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const fmtHour = (h) => {
  const period = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${period}`
}

// Single-series column chart: saves per hour today. One series, so no legend —
// the heading names what's plotted. Values live in a table below for anyone
// who can't read the bars.
function HourlyChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  // Clean y-axis top: round the max up to a tidy number.
  const top = max <= 5 ? max : Math.ceil(max / 5) * 5
  const ticks = top <= 5 ? [0, top] : [0, top / 2, top]

  return (
    <figure className="chart">
      <div className="chart-plot" role="img" aria-label={`Saves per hour today, peak ${max}`}>
        <div className="chart-yaxis" aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="ytick">{t}</span>
          ))}
        </div>

        <div className="chart-grid">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="gridline" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}

          <div className="chart-bars">
            {data.map((d) => (
              <div className="col" key={d.hour}>
                <div
                  className={d.count ? 'bar' : 'bar empty'}
                  style={{ height: d.count ? `${(d.count / top) * 100}%` : '2px' }}
                  title={`${fmtHour(d.hour)}: ${d.count} save${d.count === 1 ? '' : 's'}`}
                >
                  {d.count > 0 && <span className="bar-cap">{d.count}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Label every third hour so the axis doesn't crowd. */}
      <div className="chart-xaxis" aria-hidden="true">
        {data.map((d) => (
          <span className="xtick" key={d.hour}>
            {d.hour % 3 === 0 ? fmtHour(d.hour) : ''}
          </span>
        ))}
      </div>
    </figure>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { data, loading, error } = useAsync(
    () => (user ? getSavesByHourToday() : Promise.resolve(null)),
    [user?.id]
  )

  const total = useMemo(
    () => (data ? data.reduce((sum, d) => sum + d.count, 0) : 0),
    [data]
  )
  const busiest = useMemo(() => {
    if (!data) return null
    const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0])
    return peak.count ? peak : null
  }, [data])

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  if (authLoading) return <p className="muted detail-msg">Loading…</p>

  if (!user) {
    return (
      <section className="dashboard">
        <h1>Dashboard</h1>
        <p className="muted">
          <Link to="/signin">Sign in</Link> to see your activity.
        </p>
      </section>
    )
  }

  return (
    <section className="dashboard fade-up">
      <header className="dash-head">
        <h1>Your activity</h1>
        <p className="muted">{today}</p>
      </header>

      <PlanCard />

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Saved today</span>
          <span className="stat-value">{loading ? '—' : total}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Busiest hour</span>
          <span className="stat-value">
            {loading ? '—' : busiest ? fmtHour(busiest.hour) : 'None yet'}
          </span>
        </div>
      </div>

      <h2 className="dash-sub">Saves by hour</h2>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">Couldn’t load activity: {error.message}</p>}

      {!loading && !error && data && (
        total === 0 ? (
          <p className="muted">
            No saves yet today. Save a product from the{' '}
            <Link to="/shop">catalogue</Link> and it’ll show up here.
          </p>
        ) : (
          <HourlyChart data={data} />
        )
      )}
    </section>
  )
}
