import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getSavesByHourToday } from '../lib/queries'
import { useAsync } from '../lib/useAsync'
import { useAuth } from '../lib/auth'

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
