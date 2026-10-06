// supabase/functions/resumo-diario/index.ts
// Envia por e-mail (Resend) um resumo visual das tarefas atrasadas, de hoje e de amanhã.
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = 'America/Sao_Paulo'
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ }) // AAAA-MM-DD
const short = (d: string) => d.split('-').reverse().slice(0, 2).join('/')
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// deno-lint-ignore no-explicit-any
type Task = any
type Grupo = { titulo: string; cor: string; lista: Task[] }
const when = (t: Task) => `${t.due}T${t.time || '23:59'}`
const quadrante = (t: Task) => (t.urgent && t.important ? 'Fazer agora' : t.important ? 'Agendar' : t.urgent ? 'Delegar' : 'Eliminar')
const plural = (k: number, um: string, varios: string) => `${k} ${k === 1 ? um : varios}`

const linha = (t: Task) => `
<tr><td style="padding:12px 0;border-top:1px solid #e2e8f0;">
  <div style="font-size:15px;color:#0f172a;">${esc(t.title)}</div>
  ${t.desc ? `<div style="font-size:13px;color:#64748b;margin-top:2px;">${esc(t.desc)}</div>` : ''}
  <div style="margin-top:6px;font-size:12px;color:#64748b;">${short(t.due)}${t.time ? ' às ' + esc(t.time) : ''}<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:11px;">${quadrante(t)}</span></div>
</td></tr>`

const bloco = (g: Grupo) => `
<tr><td style="padding:24px 0 8px;">
  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${g.cor};margin-right:8px;"></span>
  <span style="font-size:14px;font-weight:600;color:#0f172a;">${g.titulo}</span>
  <span style="font-size:13px;color:#94a3b8;margin-left:6px;">${g.lista.length}</span>
</td></tr>
${g.lista.sort((a, b) => when(a).localeCompare(when(b))).map((t) => linha(t)).join('')}`

Deno.serve(async (req) => {
  // Só aceita chamadas do agendamento, que enviam o segredo combinado.
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Não autorizado', { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: rows, error } = await supabase.from('app_data').select('data')
  if (error) return new Response(error.message, { status: 500 })

  const agora = new Date()
  const hoje = day(agora)
  const amanha = day(new Date(agora.getTime() + 24 * 60 * 60 * 1000))
  const tasks: Task[] = (rows ?? []).flatMap((r) => r.data?.tasks ?? []).filter((t: Task) => !t.done && t.due)

  const grupos: Grupo[] = [
    { titulo: 'Atrasadas', cor: '#dc2626', lista: tasks.filter((t) => t.due < hoje) },
    { titulo: 'Hoje', cor: '#4f46e5', lista: tasks.filter((t) => t.due === hoje) },
    { titulo: 'Amanhã', cor: '#94a3b8', lista: tasks.filter((t) => t.due === amanha) },
  ].filter((g) => g.lista.length > 0)
  if (grupos.length === 0) return new Response('Nada a avisar hoje')

  const [atrasadas, paraHoje, paraAmanha] = [0, 1, 2].map((i) => {
    const g = ['Atrasadas', 'Hoje', 'Amanhã'][i]
    return grupos.find((x) => x.titulo === g)?.lista.length ?? 0
  })
  const partes = [
    atrasadas && plural(atrasadas, 'atrasada', 'atrasadas'),
    paraHoje && `${paraHoje} para hoje`,
    paraAmanha && `${paraAmanha} para amanhã`,
  ].filter(Boolean) as string[]

  const dataExtenso = agora.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
  const appUrl = Deno.env.get('APP_URL')
  const botao = appUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background:#4f46e5;border-radius:8px;"><a href="${esc(appUrl)}" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Abrir o app</a></td></tr></table>`
    : ''

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:24px 12px;background:#f8fafc;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;"><tr><td style="padding:28px;">
  <div style="font-size:22px;font-weight:600;color:#0f172a;">Resumo do dia</div>
  <div style="margin-top:4px;font-size:13px;color:#94a3b8;">${dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1)}</div>
  <div style="margin-top:14px;font-size:15px;color:#475569;">Você tem ${partes.join(', ').replace(/, ([^,]*)$/, ' e $1')}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${grupos.map((g) => bloco(g)).join('')}</table>
  ${botao}
</td></tr></table>
</td></tr></table>
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Tarefas <onboarding@resend.dev>',
      to: [Deno.env.get('TO_EMAIL')],
      subject: `Tarefas de ${short(hoje)}: ${partes.join(', ')}`,
      html,
    }),
  })
  return new Response(await res.text(), { status: res.ok ? 200 : 502 })
})
