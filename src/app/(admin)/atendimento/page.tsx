'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Search, CheckCircle } from 'lucide-react'

interface Usuario {
  id: string
  nome: string
  cpf: string
  telefone: string
  whatsapp: string
  data_nascimento: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
}

interface TipoAtendimento { id: string; descricao: string }
interface OrigemAtendimento { id: string; descricao: string }
interface Atendente { id: string; nome: string }

export default function NovoAtendimento() {
  const [busca, setBusca] = useState('')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [tipos, setTipos] = useState<TipoAtendimento[]>([])
  const [origens, setOrigens] = useState<OrigemAtendimento[]>([])
  const [atendentes, setAtendentes] = useState<Atendente[]>([])

  const [tipoId, setTipoId] = useState('')
  const [origemId, setOrigemId] = useState('')
  const [atendenteId, setAtendenteId] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    async function carregarOpcoes() {
      const [{ data: t }, { data: o }, { data: a }] = await Promise.all([
        supabase.from('tipos_atendimento').select('id, descricao').eq('ativo', true).order('descricao'),
        supabase.from('origens_atendimento').select('id, descricao').eq('ativo', true).order('descricao'),
        supabase.from('atendentes').select('id, nome').eq('ativo', true).order('nome'),
      ])
      setTipos(t || [])
      setOrigens(o || [])
      setAtendentes(a || [])
    }
    carregarOpcoes()
  }, [])

  async function buscarUsuario() {
    if (!busca.trim()) return
    setBuscando(true)
    setUsuario(null)
    setSucesso(false)

    const termo = busca.replace(/\D/g, '')
    let query = supabase.from('usuarios').select('*').eq('ativo', true).limit(1)

    if (termo.length >= 6) {
      query = query.ilike('cpf', `%${termo}%`)
    } else {
      query = query.ilike('nome', `%${busca.trim()}%`)
    }

    const { data } = await query.single()
    if (data) {
      setUsuario(data)
    } else {
      toast.error('Usuário não encontrado. Verifique o CPF ou nome.')
    }
    setBuscando(false)
  }

  async function registrarAtendimento() {
    if (!usuario) return
    if (!tipoId) { toast.error('Selecione o tipo de atendimento'); return }

    setSalvando(true)

    const { error } = await supabase.from('atendimentos').insert({
      usuario_id: usuario.id,
      atendente_id: atendenteId || null,
      tipo_id: tipoId,
      origem_id: origemId || null,
      observacoes: observacoes || null,
    })

    if (error) {
      toast.error(`Erro ao registrar: ${error.message}`)
    } else {
      setSucesso(true)
      toast.success('Atendimento registrado com sucesso!')
      // Limpa para próximo atendimento após 3s
      setTimeout(() => {
        setUsuario(null)
        setBusca('')
        setTipoId('')
        setOrigemId('')
        setAtendenteId('')
        setObservacoes('')
        setSucesso(false)
      }, 3000)
    }
    setSalvando(false)
  }

  function formatarCPF(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  if (sucesso) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <CheckCircle size={56} className="text-green-500" />
        <p className="text-lg font-semibold text-gray-800">Atendimento registrado!</p>
        <p className="text-sm text-gray-400">Preparando para o próximo...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Busca */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <p className="text-sm text-gray-500 mb-3">Digite o CPF ou nome do usuário para iniciar o atendimento</p>
        <div className="flex gap-3">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarUsuario()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="CPF ou nome do usuário..."
          />
          <button
            onClick={buscarUsuario}
            disabled={buscando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <Search size={16} /> {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Dados do usuário encontrado */}
      {usuario && (
        <>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {usuario.nome.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{usuario.nome}</p>
                <p className="text-sm text-gray-500">CPF: {formatarCPF(usuario.cpf)} · {usuario.telefone || usuario.whatsapp || 'Sem telefone'}</p>
              </div>
            </div>
            {usuario.endereco && (
              <p className="text-xs text-gray-400 ml-13">
                📍 {usuario.endereco}{usuario.numero ? `, ${usuario.numero}` : ''} — {usuario.bairro}, {usuario.cidade}/{usuario.estado}
              </p>
            )}
          </div>

          {/* Formulário de atendimento */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados do atendimento</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo de atendimento *</label>
                <select
                  value={tipoId}
                  onChange={e => setTipoId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Selecione...</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Origem</label>
                <select
                  value={origemId}
                  onChange={e => setOrigemId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Selecione...</option>
                  {origens.map(o => <option key={o.id} value={o.id}>{o.descricao}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Atendente responsável</label>
              <select
                value={atendenteId}
                onChange={e => setAtendenteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Selecione...</option>
                {atendentes.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Observações</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Detalhes do atendimento..."
              />
            </div>

            <button
              onClick={registrarAtendimento}
              disabled={salvando}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {salvando ? '⏳ Registrando...' : '✅ Registrar atendimento'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
