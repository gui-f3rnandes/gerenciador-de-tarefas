import { useState } from 'react'

const today = () => new Date().toLocaleDateString('sv-SE')
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export default function Pendencias({ pend, draw, onChange }) {
  const [text, setText] = useState('')
  const open = pend.filter((p) => !p.done)
  const drawn = draw?.date === today() ? pend.find((p) => p.id === draw.id) : null

  const add = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onChange({ pend: [...pend, { id: newId(), title: text.trim(), done: false }] })
    setText('')
  }
  const sortear = () => onChange({ draw: { date: today(), id: open[Math.floor(Math.random() * open.length)].id } })
  const resolve = (id) => onChange({ pend: pend.map((p) => (p.id === id ? { ...p, done: true } : p)) })
  const remove = (id) => onChange({ pend: pend.filter((p) => p.id !== id) })

  return (
    <section className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <h2 className="font-medium">Banco de pendências</h2>
      <p className="mb-4 text-xs text-slate-400">Anote o que está pendurado. Uma por dia é sorteada para você resolver.</p>

      <div className="mb-6 rounded-lg border border-slate-200 p-4">
        {drawn ? (
          drawn.done ? (
            <>
              <p className="text-slate-400 line-through">{drawn.title}</p>
              <p className="mt-1 text-sm text-slate-500">Resolvida hoje. A próxima sai amanhã.</p>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">Pendência de hoje</p>
              <p className="my-1 text-lg font-medium break-words">{drawn.title}</p>
              <button onClick={() => resolve(drawn.id)} className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                Resolvi
              </button>
            </>
          )
        ) : (
          <button
            onClick={sortear}
            disabled={open.length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Sortear a de hoje
          </button>
        )}
        {!drawn && open.length === 0 && <p className="mt-2 text-sm text-slate-400">O banco está vazio. Adicione uma pendência abaixo.</p>}
      </div>

      <form onSubmit={add} className="mb-3 flex gap-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nova pendência" aria-label="Nova pendência" className="min-w-0 flex-1 bg-transparent border-b border-slate-300 py-1.5 text-sm outline-none focus:border-slate-800" />
        <button className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500">Adicionar</button>
      </form>

      <ul className="divide-y divide-slate-100 text-sm lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {open.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2">
            <span className="break-words">{p.title}</span>
            <button onClick={() => remove(p.id)} aria-label={`Excluir ${p.title}`} className="px-1 text-slate-300 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-indigo-500">×</button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">{open.length} no banco · {pend.length - open.length} resolvidas</p>
    </section>
  )
}
