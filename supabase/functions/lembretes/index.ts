// supabase/functions/lembretes/index.ts
// Roda a cada minuto (pg_cron). Envia push no horário da tarefa (janela de 10 min)
// e um reforço entre 10 e 20 min depois, se a tarefa ainda não foi concluída.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildPushHTTPRequest } from 'npm:@pushforge/builder'

const OFFSET = '-03:00' // Brasília, sem horário de verão
const MIN = 60_000
// deno-lint-ignore no-explicit-any
type Any = any

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const privateJWK = JSON.parse(atob(Deno.env.get('VAPID_PRIVATE_KEY_B64')!))
  const agora = Date.now()

  const { data: rows, error } = await supabase.from('app_data').select('user_id, data')
  if (error) return new Response(error.message, { status: 500 })
  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, keys, user_id')

  let enviados = 0
  for (const row of rows ?? []) {
    const aparelhos = (subs ?? []).filter((s: Any) => s.user_id === row.user_id)
    if (aparelhos.length === 0) continue

    for (const t of (row.data?.tasks ?? []) as Any[]) {
      if (t.done || !t.due || !t.time) continue
      const min = (agora - Date.parse(`${t.due}T${t.time}:00${OFFSET}`)) / MIN
      const tipo = min >= 0 && min < 10 ? 'hora' : min >= 10 && min < 20 ? 'reforco' : null
      if (!tipo) continue

      // A chave única funciona como trava: só envia quem conseguir inseri-la.
      const key = `${t.id}|${t.due}|${t.time}|${tipo}`
      const { error: jaEnviado } = await supabase.from('reminders_sent').insert({ key })
      if (jaEnviado) continue

      const payload = {
        title: tipo === 'hora' ? t.title : `Ainda pendente: ${t.title}`,
        body: t.desc || (tipo === 'hora' ? `Marcada para ${t.time}` : `Era para as ${t.time}`),
        tag: key,
        url: Deno.env.get('APP_URL') || '/',
      }
      for (const a of aparelhos) {
        const { endpoint, headers, body } = await buildPushHTTPRequest({
          privateJWK,
          subscription: { endpoint: a.endpoint, keys: a.keys },
          message: {
            payload,
            adminContact: `mailto:${Deno.env.get('TO_EMAIL')}`,
            options: { urgency: 'high', ttl: 600 }, // descarta se o aparelho ficar 10 min sem receber
          },
        })
        const res = await fetch(endpoint, { method: 'POST', headers, body })
        if (res.status === 404 || res.status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', a.endpoint) // inscrição expirada
        } else if (res.ok) {
          enviados++
        }
      }
    }
  }

  await supabase.from('reminders_sent').delete().lt('sent_at', new Date(agora - 7 * 24 * 60 * MIN).toISOString())
  return new Response(`enviados: ${enviados}`)
})
