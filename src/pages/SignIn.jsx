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
    const { error } =
      mode === 'signin'
        ? await signIn(form.email, form.password)
        : await signUp(form.email, form.password, form.fullName)

    if (error) return setStatus({ error: error.message })
    navigate('/')
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

      <button
        type="button"
        className="linklike"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin'
          ? 'Need an account? Sign up'
          : 'Have an account? Sign in'}
      </button>
    </form>
  )
}
