import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, simulateSubscribe } from '../lib/auth'

// SIMULATION ONLY — plan options mirror public.plans / signup_sim.html. When
// real checkout (PayMongo) ships, drop the picker and the simulateSubscribe
// calls below; account creation itself stays exactly as it is.
const PLANS = [
  {
    id: 'fusionedge',
    name: 'FusionEdge only',
    access: 'Palette drag-into-Revit · plugin tools locked',
  },
  {
    id: 'plugin',
    name: 'Revit Plugin only',
    access: 'Plugin tools · palette drag off',
  },
  {
    id: 'bundle',
    name: 'FusionEdge + Plugin',
    access: 'Everything — palette drag and plugin tools',
  },
]

// Where we stash a chosen plan when sign-up can't activate it yet (email
// confirmation is on, so there's no session until the user confirms + signs in).
const PENDING_PLAN_KEY = 'fe_pending_plan'

export default function SignIn() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [plan, setPlan] = useState('fusionedge')
  const [status, setStatus] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setStatus({ busy: true })

    if (mode === 'signin') {
      const { error } = await signIn(form.email, form.password)
      if (error) return setStatus({ error: error.message })
      // Activate a plan chosen at sign-up but deferred until the user had a
      // session (the email-confirmation path). Best-effort; never blocks login.
      await activatePendingPlan()
      return navigate('/')
    }

    // Sign up. If email confirmation is ON, a new customer has NO session yet —
    // they must click the link in their email before they can sign in, so the
    // plan can't be activated now; we remember it and activate on first sign-in.
    // If confirmation is OFF, Supabase returns a session and we activate here.
    const { data, error } = await signUp(
      form.email,
      form.password,
      form.fullName
    )
    if (error) return setStatus({ error: error.message })

    // Supabase doesn't error when the email is already registered (it avoids
    // leaking which emails exist). On a project with email confirmation ON, a
    // duplicate comes back with NO session and an EMPTY identities array, while
    // a genuinely new signup has one identity. Treat the empty case as "taken"
    // so we don't send a misleading "check your email" message.
    const alreadyRegistered =
      !data?.session && (data?.user?.identities?.length ?? 0) === 0
    if (alreadyRegistered) {
      setStatus({
        error:
          'An account with this email already exists. Try signing in instead.',
      })
      return
    }

    if (data?.session) {
      const { error: subErr } = await simulateSubscribe(plan)
      if (subErr) return setStatus({ error: subErr.message })
      return navigate('/')
    }

    // No session yet: remember the plan and finish activation after sign-in.
    try {
      sessionStorage.setItem(PENDING_PLAN_KEY, plan)
    } catch { /* ignore storage failures */ }
    setStatus({
      info: `Almost there — we sent a confirmation link to ${form.email}. Click it to activate your account, then sign in and your plan turns on.`,
    })
    setMode('signin')
  }

  // After a successful sign-in, apply any plan chosen during an earlier sign-up
  // that couldn't be activated then (email-confirmation path). One-shot.
  async function activatePendingPlan() {
    let pending = null
    try {
      pending = sessionStorage.getItem(PENDING_PLAN_KEY)
    } catch { /* ignore */ }
    if (!pending) return
    try {
      await simulateSubscribe(pending)
    } catch { /* best-effort; the account still works without a plan */ }
    try {
      sessionStorage.removeItem(PENDING_PLAN_KEY)
    } catch { /* ignore */ }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-dot" />
          <strong>Fusion Edge</strong>
        </div>

        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-lede">
          {isSignup
            ? 'Register to save products and build your library.'
            : 'Sign in to your Fusion Edge storefront account.'}
        </p>

        <form onSubmit={submit} className="form">
          {isSignup && (
            <label>
              Name
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={6}
              placeholder={isSignup ? 'At least 6 characters' : undefined}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          {isSignup && (
            <div className="auth-plans">
              <span className="auth-plans-label">Choose a plan</span>
              <div className="auth-plan-grid">
                {PLANS.map((p) => {
                  const on = plan === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={on ? 'auth-plan on' : 'auth-plan'}
                      aria-pressed={on}
                      onClick={() => setPlan(p.id)}
                    >
                      <span className="auth-plan-check" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="auth-plan-name">{p.name}</span>
                      <span className="auth-plan-access">{p.access}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button type="submit" disabled={status?.busy}>
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
          {status?.error && <p className="error">{status.error}</p>}
          {status?.info && <p className="info">{status.info}</p>}
        </form>

        <p className="auth-alt">
          {isSignup ? 'Already have an account? ' : 'Need an account? '}
          <button
            type="button"
            className="linklike"
            onClick={() => {
              setStatus(null)
              setMode(isSignup ? 'signin' : 'signup')
            }}
          >
            {isSignup ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
