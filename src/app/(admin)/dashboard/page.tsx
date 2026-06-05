'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Usuario {
  id: string
  nome: string
  whatsapp: string
  telefone: string
  data_nascimento: string
}

interface Stats {
  total_usuarios: number
  atendimentos_hoje: number
  aniversariantes_hoje: number
  msgs_enviadas: number
}

export default function Dashboard() {
  const [hoje, setHoje] = useState<Usuario[]>([])
  const [amanha, setAmanha] = useState<Usuario[]>([])
  const [stats, setStats] = useState<Stats>({ total_usuarios: 0, atendimentos_hoje: 0, aniversariantes_hoje: 0, msgs_enviadas: 0 })
  const [loading, setLoading] = useState(true)

  const dataHoje = new Date()
  const dataAmanha = addDays(dataHoje, 1)

  useEffect(() => {
    carregarDados()
  }, [])

  function filtrarAniversariantes(usuarios: Usuario[], data: Date) {
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return usuarios.filter((u) => {
      const [, m, d] = u.data_nascimento.split('-')
      return m === mes && d === dia
    })
  }

  async function carregarDados() {
    setLoading(true)

    const [{ data: usuarios }, { count: totalUsuarios }, { count: atendimentosHoje }, { count: msgsHoje }] = await Promise.all([
      supabase.from('usuarios').select('id, nome, whatsapp, telefone, data_nascimento').eq('ativo', true),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('atendimentos').select('*', { count: 'exact', head: true })
        .gte('data_atendimento', format(dataHoje, 'yyyy-MM-dd'))
        .lt('data_atendimento', format(addDays(dataHoje, 1), 'yyyy-MM-dd')),
      supabase.from('notificacoes_log').select('*', { count: 'exact', head: true })
        .eq('status', 'enviado')
        .gte('created_at', format(dataHoje, 'yyyy-MM-dd')),
    ])

    const aniversariantesHoje = filtrarAniversariantes(usuarios || [], dataHoje)
    const aniversariantesAmanha = filtrarAniversariantes(usuarios || [], dataAmanha)

    setHoje(aniversariantesHoje)
    setAmanha(aniversariantesAmanha)
    setStats({
      total_usuarios: totalUsuarios || 0,
      atendimentos_hoje: atendimentosHoje || 0,
      aniversariantes_hoje: aniversariantesHoje.length,
      msgs_enviadas: msgsHoje || 0,
    })

    setLoading(false)
  }

  async function enviarParabens(usuario: Usuario) {
    const numero = usuario.whatsapp || usuario.telefone
    if (!numero) {
      toast.error('Usuário não tem WhatsApp/telefone cadastrado')
      return
    }

    const { data: config } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'msg_aniversario')
      .single()

    const template = config?.valor || 'Feliz aniversário, {nome}! 🎂'

    const res = await fetch('/api/notificacoes/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: usuario.id,
        telefone: numero,
        tipo: 'aniversario',
        mensagem_template: template,
        variaveis: { nome: usuario.nome.split(' ')[0] },
      }),
    })

    const resultado = await res.json()
    if (resultado.sucesso) {
      toast.success(`Parabéns enviado para ${usuario.nome}! 🎉`)
    } else {
      toast.error(`Erro: ${resultado.erro}`)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      {/* Cards de stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Usuários cadastrados', valor: stats.total_usuarios.toLocaleString(), destaque: true },
          { label: 'Atendimentos hoje', valor: stats.atendimentos_hoje, destaque: false },
          { label: 'Aniversariantes hoje', valor: stats.aniversariantes_hoje, destaque: true },
          { label: 'WhatsApp enviados hoje', valor: stats.msgs_enviadas, destaque: false },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.destaque ? 'text-orange-500' : 'text-gray-800'}`}>
              {s.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Aniversariantes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hoje */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-100 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
              🎂 Aniversariantes hoje — {format(dataHoje, "dd/MM", { locale: ptBR })}
            </span>
          </div>

          {hoje.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum aniversariante hoje</p>
          ) : (
            <div className="space-y-3">
              {hoje.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.nome}</p>
                    <p className="text-xs text-gray-400">{u.whatsapp || u.telefone || 'Sem telefone'}</p>
                  </div>
                  {(u.whatsapp || u.telefone) && (
                    <button
                      onClick={() => enviarParabens(u)}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg"
                    >
                      📱 WA
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amanhã */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
              🎂 Aniversariantes amanhã — {format(dataAmanha, "dd/MM", { locale: ptBR })}
            </span>
          </div>

          {amanha.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum aniversariante amanhã</p>
          ) : (
            <div className="space-y-3">
              {amanha.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.nome}</p>
                    <p className="text-xs text-gray-400">{u.whatsapp || u.telefone || 'Sem telefone'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
