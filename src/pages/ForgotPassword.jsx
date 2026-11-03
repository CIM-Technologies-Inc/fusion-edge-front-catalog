import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/auth'
import { useToast } from '../lib/toast'

// Standalone "forgot password" page. Sends a reset email whose link returns the
// user to /reset-password to set a new password.
export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setStatus({ busy: true })
    const { error } = await requestPasswordReset(email)
    if (error) {
      setStatus({ error: error.message })
      toast.error(error.message)
      return
    }
    // Don't reveal whether the email exists — always show the same message.
    setStatus({
      info: `If an account exists for ${email}, we've sent a password-reset link. Check your inbox.`,
    })
    toast.success('Password-reset link sent (check your email).', 6000)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-dot" />
          <strong>Fusion Edge</strong>
        </div>

        <h1>Reset your password</h1>
        <p className="auth-lede">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={submit} className="form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <button type="submit" disabled={status?.busy}>
            {status?.busy ? 'Sending…' : 'Send reset link'}
          </button>
          {status?.error && <p className="error">{status.error}</p>}
          {status?.info && <p className="info">{status.info}</p>}
        </form>

        <p className="auth-alt">
          Remembered it? <Link className="linklike" to="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
