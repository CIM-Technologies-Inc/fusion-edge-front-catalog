import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../lib/auth'

export default function SignIn() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [status, setStatus] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setStatus({ busy: true })

    if (mode === 'signin') {
      const { error } = await signIn(form.email, form.password)
      if (error) return setStatus({ error: error.message })
      return navigate('/')
    }

    // Sign up. Email confirmation is on, so a new customer has NO session yet —
    // they must click the link in their email before they can sign in. Show a
    // "check your email" message instead of navigating. (If confirmation is
    // ever turned off, Supabase returns a session and we send them in.)
    const { data, error } = await signUp(
      form.email,
      form.password,
      form.fullName
    )
    if (error) return setStatus({ error: error.message })
    if (data?.session) return navigate('/')
    setStatus({
      info: `Almost there — we sent a confirmation link to ${form.email}. Click it to activate your account, then sign in.`,
    })
    setMode('signin')
  }

  return (
    <form onSubmit={submit} className="form">
      <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>

      {mode === 'signup' && (
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
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </label>

      <button type="submit" disabled={status?.busy}>
        {mode === 'signin' ? 'Sign in' : 'Sign up'}
      </button>
      {status?.error && <p className="error">{status.error}</p>}
      {status?.info && <p className="info">{status.info}</p>}

      <button
        type="button"
        className="linklike"
        onClick={() => {
          setStatus(null)
          setMode(mode === 'signin' ? 'signup' : 'signin')
        }}
      >
        {mode === 'signin'
          ? 'Need an account? Sign up'
          : 'Have an account? Sign in'}
      </button>
    </form>
  )
}
