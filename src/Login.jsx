import { useState } from 'react'
import { supabase } from './supabase'

const field = 'w-full bg-transparent border-b border-slate-300 py-2 text-sm outline-none focus:border-slate-800'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Verifique a conexão e tente de novo.',
      )
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-800">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" aria-label="E-mail" autoComplete="username" required className={field} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" aria-label="Senha" autoComplete="current-password" required className={field} />
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
