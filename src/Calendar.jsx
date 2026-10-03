import { useState } from 'react'

const iso = (d) => d.toLocaleDateString('sv-SE')
const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Calendar({ tasks, day, onPick }) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const lead = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: total }, (_, k) => iso(new Date(y, m, k + 1))),
  ]
  const busy = new Set(tasks.filter((t) => !t.done && t.due).map((t) => t.due))
  const today = iso(new Date())
  const shift = (n) => setCursor(new Date(y, m + n, 1))
  const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const list = day ? tasks.filter((t) => t.due === day) : []

  return (
    <section className="lg:shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium capitalize">{label}</h2>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">‹</button>
          <button onClick={() => shift(1)} aria-label="Próximo mês" className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-slate-400">
        {WEEK.map((w, i) => (
          <span key={i} className="py-1">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {cells.map((c, i) =>
          c ? (
            <button
              key={c}
              onClick={() => onPick(day === c ? null : c)}
              className={`relative mx-auto h-9 w-9 rounded-full ${
                day === c ? 'bg-slate-900 text-slate-50' : c === today ? 'font-semibold ring-1 ring-slate-300' : 'hover:bg-slate-100'
              }`}
            >
              {Number(c.slice(8))}
              {busy.has(c) && (
                <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${day === c ? 'bg-slate-50' : 'bg-indigo-500'}`} />
              )}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>

      {day && (
        <ul className="mt-4 max-h-24 space-y-1 overflow-y-auto border-t border-slate-100 pt-3 text-sm">
          {list.length === 0 && <li className="text-slate-400">Nenhuma tarefa neste dia.</li>}
          {list.map((t) => (
            <li key={t.id} className={t.done ? 'text-slate-400 line-through' : ''}>{t.title}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
