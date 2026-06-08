'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Search, MessageSquare, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Usuario {
  id: string
  nome: string
  cpf: string
  telefone: string
  whatsapp: string
  data_nascimento: string
  cidade: string
  estado: string
  endereco: string
  bairro: string
  nome_assessor: string
  created_at: string
}

interface TipoAtendimento {
  id: string
  descricao: string
}

export default function ConsultarUsuarios() {
  const [busca, setBusca] = useState('')
  const [tipoBusca, setTipoBusca] = useState('nome')
  const [tipoSelecionado, setTipoSelecionado] = useState('')
  const [tipos, setTipos] = useState<TipoAtendimento[]>([])
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscou, setBuscou] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.from('tipos_atendimento').select('id, descricao').eq('ativo', true).order('descricao')
      .then(({ data }) => setTipos(data || []))
  }, [])

  async function buscar() {
    setBuscando(true)
    setBuscou(true)

    let resultadoFinal: Usuario[] = []

    if (tipoBusca === 'tipo_atendimento' && tipoSelecionado) {
      const { data: atendsData } = await supabase
        .from('atendimentos')
        .select('usuario_id')
        .eq('tipo_id', tipoSelecionado)

      const idsUnicos: string[] = []
      const vistos: Record<string, boolean> = {}
      for (const a of (atendsData || [])) {
        if (!vistos[a.usuario_id]) {
          vistos[a.usuario_id] = true
          idsUnicos.push(a.usuario_id)
        }
      }

      if (idsUnicos.length === 0) {
        setResultados([])
        setBuscando(false)
        return
      }

      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('ativo', true)
        .in('id', idsUnicos)
        .order('nome')
        .limit(100)

      resultadoFinal = data || []
    } else {
      let query = supabase.from('usuarios').select('*').eq('ativo', true).limit(100)

      if (tipoBusca === 'nome' && busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
      } else if (tipoBusca === 'cpf' && busca.trim()) {
        query = query.ilike('cpf', `%${busca.replace(/\D/g, '')}%`)
      } else if (tipoBusca === 'endereco' && busca.trim()) {
        query = query.or(`endereco.ilike.%${busca.trim()}%,bairro.ilike.%${busca.trim()}%,cidade.ilike.%${busca.trim()}%`)
      }

      const { data, error } = await query.order('nome')
      if (error) {
        toast.error('Erro ao buscar usuários')
        setBuscando(false)
        return
      }
      resultadoFinal = data || []
    }

    setResultados(resultadoFinal)
    setBuscando(false)
  }

  async function enviarMensagem(e: React.MouseEvent, usuario: Usuario) {
    e.stopPropagation()
    const numero = usuario.whatsapp || usuario.telefone
    if (!numero) { toast.error('Usuário sem telefone cadastrado'); return }
    const msg = prompt(`Mensagem para ${usuario.nome.split(' ')[0]}:`)
    if (!msg) return
    const res = await fetch('/api/notificacoes/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuario.id, telefone: numero, tipo: 'manual', mensagem_template: msg, variaveis: {} }),
    })
    const r = await res.json()
    r.sucesso ? toast.success('Mensagem enviada!') : toast.error(`Erro: ${r.erro}`)
  }

  function formatarCPF(cpf: string) {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'nome', label: '👤 Nome' },
            { key: 'cpf', label: '🪪 CPF' },
            { key: 'endereco', label: '📍 Endereço' },
            { key: 'tipo_atendimento', label: '📋 Tipo de atendimento' },
          ].map(t => (
            <button key={t.key} onClick={() => setTipoBusca(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tipoBusca === t.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          {tipoBusca === 'tipo_atendimento' ? (
            <select value={tipoSelecionado} onChange={e => setTipoSelecionado(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Selecione o tipo de atendimento...</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
            </select>
          ) : (
            <input value={busca} onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder={
                tipoBusca === 'nome' ? 'Digite o nome...' :
                tipoBusca === 'cpf' ? 'Digite o CPF...' :
                'Digite rua, bairro ou cidade...'
              } />
          )}
          <button onClick={buscar} disabled={buscando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
            <Search size={16} />
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {buscou && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {resultados.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum usuário encontrado</p>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
                {resultados.length} resultado(s) — clique para ver o cadastro completo
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">CPF</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nascimento</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Telefone</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cidade</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Assessor</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-orange-50 cursor-pointer"
                      onClick={() => router.push(`/consultar/usuario/${u.id}`)}>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">
                        <div className="flex items-center gap-1">{u.nome} <ExternalLink size={12} className="text-gray-300" /></div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatarCPF(u.cpf)}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {u.data_nascimento ? format(new Date(u.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.telefone || u.whatsapp || '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.cidade ? `${u.cidade}/${u.estado}` : '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">{u.nome_assessor || '-'}</td>
                      <td className="px-5 py-3">
                        {(u.whatsapp || u.telefone) && (
                          <button onClick={(e) => enviarMensagem(e, u)}
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg">
                            <MessageSquare size={13} /> WA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
