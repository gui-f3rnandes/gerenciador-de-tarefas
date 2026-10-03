import { useState } from 'react'

const QUADS = [
  { title: 'Fazer agora', hint: 'Urgente e importante', u: true, i: true, accent: 'border-t-indigo-500' },
  { title: 'Agendar', hint: 'Importante, mas não urgente', u: false, i: true, accent: 'border-t-slate-300' },
  { title: 'Delegar', hint: 'Urgente, mas não importante', u: true, i: false, accent: 'border-t-slate-300' },
  { title: 'Eliminar', hint: 'Nem urgente nem importante', u: false, i: false, accent: 'border-t-slate-300' },
]

const today = () => new Date().toLocaleDateString('sv-SE')
const nowHM = () => new Date().toTimeString().slice(0, 5)
const shortDate = (d) => d.split('-').reverse().slice(0, 2).join('/')
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const late = (t) => !t.done && t.due && (t.due < today() || (t.due === today() && t.time && t.time < nowHM()))
const byDue = (a, b) => {
  if (!a.due && !b.due) return 0
  if (!a.due) return 1
  if (!b.due) return -1
  return `${a.due}T${a.time || '23:59'}`.localeCompare(`${b.due}T${b.time || '23:59'}`)
}
const blank = { title: '', desc: '', urgent: false, important: true, due: '', time: '' }
const field = 'bg-transparent border-b border-slate-300 py-1.5 text-sm outline-none focus:border-slate-800'
const bind = (v, set) => (k) => (e) => set({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

function Fields({ v, on, children }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <input value={v.title} onChange={on('title')} placeholder="Nova tarefa" aria-label="Título" className={`${field} min-w-0 flex-1 basis-60`} />
      <input value={v.desc} onChange={on('desc')} placeholder="Descrição (opcional)" aria-label="Descrição" className={`${field} min-w-0 flex-1 basis-60`} />
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={v.urgent} onChange={on('urgent')} className="accent-indigo-600" />
        Urgente
      </label>
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={v.important} onChange={on('important')} className="accent-indigo-600" />
        Importante
      </label>
      <input type="date" value={v.due} onChange={on('due')} aria-label="Data de entrega" className={`${field} text-slate-600`} />
      <input type="time" value={v.time} onChange={on('time')} aria-label="Horário" className={`${field} text-slate-600`} />
      {children}
    </div>
  )
}

export default function Matrix({ tasks, onChange }) {
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [over, setOver] = useState(null)

  const patch = (id, p) => onChange(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const remove = (id) => onChange(tasks.filter((t) => t.id !== id))
  const add = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onChange([...tasks, { ...form, title: form.title.trim(), id: newId(), done: false }])
    setForm(blank)
  }
  const save = () => {
    if (editing.title.trim()) patch(editing.id, { ...editing, title: editing.title.trim() })
    setEditing(null)
  }
  const btn = 'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'

  return (
    <section className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <form onSubmit={add} className="mb-5">
        <Fields v={form} on={bind(form, setForm)}>
          <button className={`${btn} bg-slate-900 text-slate-50 hover:bg-slate-700`}>Adicionar</button>
        </Fields>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-rows-2">
        {QUADS.map((q) => {
          const list = tasks.filter((t) => t.urgent === q.u && t.important === q.i).sort((a, b) => a.done - b.done || byDue(a, b))
          return (
            <div
              key={q.title}
              onDragOver={(e) => { e.preventDefault(); setOver(q.title) }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) patch(id, { urgent: q.u, important: q.i })
                setOver(null)
              }}
              className={`min-h-40 lg:min-h-0 lg:overflow-y-auto rounded-lg border border-t-2 border-slate-200 p-4 ${q.accent} ${over === q.title ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
            >
              <h2 className="font-medium">{q.title}</h2>
              <p className="mb-2 text-xs text-slate-400">{q.hint}</p>
              <ul className="divide-y divide-slate-100">
                {list.map((t) =>
                  editing?.id === t.id ? (
                    <li key={t.id} className="py-3">
                      <Fields v={editing} on={bind(editing, setEditing)}>
                        <button type="button" onClick={save} className={`${btn} bg-slate-900 text-slate-50 hover:bg-slate-700`}>Salvar</button>
                        <button type="button" onClick={() => setEditing(null)} className={`${btn} text-slate-500 hover:bg-slate-100`}>Cancelar</button>
                      </Fields>
                    </li>
                  ) : (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => setOver(null)}
                      className="flex cursor-grab items-start gap-2 py-2 text-sm"
                    >
                      <input type="checkbox" checked={t.done} onChange={() => patch(t.id, { done: !t.done })} aria-label={`Concluir ${t.title}`} className="mt-0.5 accent-indigo-600" />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditing({ ...t })}
                        onKeyDown={(e) => e.key === 'Enter' && setEditing({ ...t })}
                        aria-label={`Editar ${t.title}`}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className={`break-words ${t.done ? 'text-slate-400 line-through' : ''}`}>{t.title}</p>
                        {t.desc && <p className="break-words text-xs text-slate-500">{t.desc}</p>}
                        {(t.due || t.time) && (
                          <p className={`text-xs ${late(t) ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                            {t.due && shortDate(t.due)}{t.due && t.time && ' às '}{t.time}
                          </p>
                        )}
                      </div>
                      <button onClick={() => remove(t.id)} aria-label={`Excluir ${t.title}`} className="px-1 text-slate-300 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-indigo-500">×</button>
                    </li>
                  ),
                )}
              </ul>
              {list.length === 0 && <p className="text-sm text-slate-300">Nada por aqui.</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
