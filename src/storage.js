import { supabase } from './supabase'

const LOCAL = 'app-tarefas:v1'
const empty = { tasks: [], notes: '', pend: [], draw: null }

// Cópia local: serve de backup e, na primeira vez, de origem da migração para a nuvem.
const local = () => {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(LOCAL)) }
  } catch {
    return empty
  }
}

// Lança erro se a nuvem não responder (para nunca sobrescrever dados novos com antigos).
// stamp = versão da nuvem em ms; null quando ainda não existe linha (usa os dados locais).
export async function loadData() {
  const { data: row, error } = await supabase.from('app_data').select('data, updated_at').maybeSingle()
  if (error) throw error
  if (!row) return { data: local(), stamp: null }
  return { data: { ...empty, ...row.data }, stamp: Date.parse(row.updated_at) }
}

// Devolve o novo stamp (ms) se salvou, ou null se falhou.
export async function saveData(userId, data) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(data))
  } catch {
    // armazenamento local indisponível
  }
  const at = new Date()
  const { error } = await supabase.from('app_data').upsert({ user_id: userId, data, updated_at: at.toISOString() })
  return error ? null : at.getTime()
}
