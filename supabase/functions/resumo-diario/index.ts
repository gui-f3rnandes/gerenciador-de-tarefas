// supabase/functions/resumo-diario/index.ts
// Envia por e-mail (Resend) as tarefas atrasadas, de hoje e de amanhã.
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'America/Sao_Paulo'
const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ }) // AAAA-MM-DD
const short = (d: string) => d.split('-').reverse().slice(0, 2).join('/')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// deno-lint-ignore no-explicit-any
type Task = any
const when = (t: Task) => `${t.due}T${t.time || '23:59'}`

Deno.serve(async (req) => {
  // Só aceita chamadas do agendamento, que enviam o segredo combinado.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: rows, error } = await supabase.from('app_data').select('data')
  if (error) return new Response(error.message, { status: 500 })

  const hoje = day(new Date())
  const amanha = day(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const tasks: Task[] = (rows ?? []).flatMap((r) => r.data?.tasks ?? []).filter((t: Task) => !t.done && t.due)

  const grupos: [string, Task[]][] = [
    ['Atrasadas', tasks.filter((t) => t.due < hoje)],
    ['Hoje', tasks.filter((t) => t.due === hoje)],
    ['Amanhã', tasks.filter((t) => t.due === amanha)],
  ]
  const comTarefas = grupos.filter(([, lista]) => lista.length > 0)
  if (comTarefas.length === 0) return new Response('Nada a avisar hoje')

  const html = comTarefas
    .map(
      ([titulo, lista]) =>
        `<h3>${titulo} (${lista.length})</h3><ul>` +
        lista
          .sort((a, b) => when(a).localeCompare(when(b)))
          .map((t) => `<li>${esc(String(t.title))} <small>${short(t.due)}${t.time ? ' às ' + t.time : ''}</small></li>`)
          .join('') +
        '</ul>',
    )
    .join('')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Tarefas <onboarding@resend.dev>',
      to: [Deno.env.get('TO_EMAIL')],
      subject: `Resumo das tarefas de ${short(hoje)}`,
      html,
    }),
  })
  return new Response(await res.text(), { status: res.ok ? 200 : 502 })
})
