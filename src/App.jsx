import { useEffect, useState } from 'react'
import { configured, supabase } from './supabase'
import Login from './Login'
import Board from './Board'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = verificando

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) {
    return (
      <p className="p-6 text-sm text-slate-800">
        Faltam as chaves do Supabase. Copie <code>.env.example</code> para <code>.env.local</code>, preencha e reinicie o servidor.
      </p>
    )
  }
  if (session === undefined) return null
  return session ? <Board key={session.user.id} userId={session.user.id} /> : <Login />
}
