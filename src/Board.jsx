import { useCallback, useEffect, useRef, useState } from 'react'
import { loadData, saveData } from './storage'
import { supabase } from './supabase'
import Matrix from './Matrix'
import Calendar from './Calendar'
import Notes from './Notes'
import Pendencias from './Pendencias'

const TEMA = 'app-tarefas:tema'
const STATUS = { saved: 'Salvo na nuvem', saving: 'Salvando…', error: 'Erro ao salvar' }
const ghost = 'rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500'

export default function Board({ userId }) {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [status, setStatus] = useState('saved')
  const [day, setDay] = useState(null)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const stamp = useRef(null) // versão da nuvem que conhecemos
  const dirty = useRef(false) // alteração ainda não enviada
  const skip = useRef(false) // a próxima mudança de data veio da nuvem
  const latest = useRef(null)

  const load = useCallback(async () => {
    try {
      const r = await loadData()
      stamp.current = r.stamp
      skip.current = r.stamp !== null // sem linha na nuvem: salva (migra) os dados locais
      setData(r.data)
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  const flush = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    const s = await saveData(userId, latest.current)
    if (s) {
      stamp.current = s
      setStatus(dirty.current ? 'saving' : 'saved')
    } else {
      dirty.current = true
      setStatus('error')
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data) return
    latest.current = data
    if (skip.current) {
      skip.current = false
      return
    }
    dirty.current = true
    setStatus('saving')
    const id = setTimeout(flush, 800)
    return () => clearTimeout(id)
  }, [data, flush])

  // Ao sair da aba: envia o que falta. Ao voltar: busca mudanças feitas em outro aparelho.
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === 'hidden') return flush()
      if (dirty.current) return
      try {
        const r = await loadData()
        if (!dirty.current && r.stamp && r.stamp !== stamp.current) {
          stamp.current = r.stamp
          skip.current = true
          setData(r.data)
        }
      } catch {
        // sem conexão: mantém o que está na tela
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [flush])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(TEMA, dark ? 'dark' : 'light')
    } catch {
      // sem armazenamento: o tema vale só nesta sessão
    }
  }, [dark])

  const sair = async () => {
    await flush()
    await supabase.auth.signOut()
  }

  if (loadError) {
    return (
      <div className="p-6 text-sm text-slate-800">
        <p className="mb-3">Não foi possível carregar seus dados. Verifique a conexão.</p>
        <button onClick={load} className={ghost}>Tentar de novo</button>
        <button onClick={sair} className={ghost}>Sair</button>
      </div>
    )
  }
  if (!data) return <p className="p-6 text-sm text-slate-400">Carregando…</p>

  const set = (patch) => setData((d) => ({ ...d, ...patch }))

  return (
    <div className="min-h-screen text-slate-800 lg:h-screen lg:overflow-hidden">
      <main className="mx-auto flex max-w-screen-2xl flex-col px-4 py-4 sm:px-6 lg:h-full">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <div className="flex items-center gap-1">
            <span aria-live="polite" className={`mr-2 text-xs ${status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
              {STATUS[status]}
            </span>
            <button onClick={() => setDark(!dark)} className={ghost}>{dark ? 'Modo claro' : 'Modo escuro'}</button>
            <button onClick={sair} className={ghost}>Sair</button>
          </div>
        </header>
        <div className="grid gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_19rem_19rem] lg:grid-rows-1">
          <Matrix tasks={data.tasks} onChange={(tasks) => set({ tasks })} />
          <div className="flex flex-col gap-6 lg:min-h-0">
            <Calendar tasks={data.tasks} day={day} onPick={setDay} />
            <Notes value={data.notes} onChange={(notes) => set({ notes })} />
          </div>
          <Pendencias pend={data.pend} draw={data.draw} onChange={set} />
        </div>
      </main>
    </div>
  )
}
