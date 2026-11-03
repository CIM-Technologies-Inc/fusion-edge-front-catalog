import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updatePassword } from '../lib/auth'
import { useToast } from '../lib/toast'

// Landing page for the password-reset email link. Supabase parses the recovery
// token from the URL and emits a PASSWORD_RECOVERY auth event, giving a short
// recovery session in which updateUser({ password }) is allowed. We wait for
// that session before enabling the form, so a direct visit (no token) is told
// to request a fresh link rather than silently failing.
export default function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [status, setStatus] = useState(null)

  useEffect(() => {
    // If a recovery session is already present (link just opened), we're ready.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      return setStatus({ error: 'Passwords do not match.' })
    }
    setStatus({ busy: true })
    const { error } = await updatePassword(form.password)
    if (error) {
      setStatus({ error: error.message })
      toast.error(error.message)
      return
    }
    setStatus(null)
    toast.success('Password updated — you can sign in now.')
    // Sign out of the recovery session so they sign in fresh with the new one.
    await supabase.auth.signOut()
    setTimeout(() => navigate('/signin'), 700)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-dot" />
          <strong>Fusion Edge</strong>
        </div>

        <h1>Set a new password</h1>
        <p className="auth-lede">
          Choose a new password for your Fusion Edge account.
        </p>

        {!ready ? (
          <p className="info">
            Waiting for your reset link… If you opened this page directly,
            request a new link from the{' '}
            <button
              type="button"
              className="linklike"
              onClick={() => navigate('/signin')}
            >
              sign-in page
            </button>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="form">
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={form.confirm}
                onChange={(e) =>
                  setForm({ ...form, confirm: e.target.value })
                }
              />
            </label>

            <button type="submit" disabled={status?.busy}>
              {status?.busy ? 'Updating…' : 'Update password'}
            </button>
            {status?.error && <p className="error">{status.error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
