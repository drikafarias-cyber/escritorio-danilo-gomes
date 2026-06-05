'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface Atendimento {
  id: string
  data_atendimento: string
  observacoes: string
  usuarios: { nome: string; cpf: string }
  tipos_atendimento: { descricao: string }
  origens_atendimento: { descricao: string }
  atendentes: { nome: string }
}

interface Tipo { id: string; descricao: string }
interface Origem { id: string; descricao: string }

export default function ConsultarAtendimentos() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [origens, setOrigens] = useState<Origem[]>([])
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({
    tipo_id: '', origem_id: '', data_inicio: '', data_fim: '', nome: '',
  })

  useEffect(() => {
    async function carregarFiltros() {
      const [{ data: t }, { data: o }] = await Promise.all([
        supabase.from('tipos_atendimento').select('id, descricao').eq('ativo', true).order('descricao'),
        supabase.from('origens_atendimento').select('id, descricao').eq('ativo', true).order('descricao'),
      ])
      setTipos(t || [])
      setOrigens(o || [])
    }
    carregarFiltros()
    buscar()
  }, [])

  async function buscar() {
    setLoading(true)

    let query = supabase
      .from('atendimentos')
      .select(`
        id, data_atendimento, observacoes,
        usuarios(nome, cpf),
        tipos_atendimento(descricao),
        origens_atendimento(descricao),
        atendentes(nome)
      `)
      .order('data_atendimento', { ascending: false })
      .limit(100)

    if (filtros.tipo_id) query = query.eq('tipo_id', filtros.tipo_id)
    if (filtros.origem_id) query = query.eq('origem_id', filtros.origem_id)
    if (filtros.data_inicio) query = query.gte('data_atendimento', filtros.data_inicio)
    if (filtros.data_fim) query = query.lte('data_atendimento', filtros.data_fim + 'T23:59:59')

    const { data, error } = await query

    if (error) {
      toast.error('Erro ao buscar atendimentos')
    } else {
      let resultado = (data || []) as unknown as Atendimento[]
      if (filtros.nome) {
        resultado = resultado.filter(a =>
          a.usuarios?.nome?.toLowerCase().includes(filtros.nome.toLowerCase())
        )
      }
      setAtendimentos(resultado)
    }
    setLoading(false)
  }

  function formatarCPF(cpf: string) {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <div className="max-w-6xl">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Filtros</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome do usuário</label>
            <input value={filtros.nome} onChange={e => setFiltros(p => ({ ...p, nome: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Buscar por nome..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de atendimento</label>
            <select value={filtros.tipo_id} onChange={e => setFiltros(p => ({ ...p, tipo_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Todos</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.descricao}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Origem</label>
            <select value={filtros.origem_id} onChange={e => setFiltros(p => ({ ...p, origem_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Todas</option>
              {origens.map(o => <option key={o.id} value={o.id}>{o.descricao}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data início</label>
            <input type="date" value={filtros.data_inicio} onChange={e => setFiltros(p => ({ ...p, data_inicio: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data fim</label>
            <input type="date" value={filtros.data_fim} onChange={e => setFiltros(p => ({ ...p, data_fim: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="flex items-end">
            <button onClick={buscar} disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-medium w-full disabled:opacity-60">
              {loading ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
          {atendimentos.length} atendimento(s)
        </div>
        {atendimentos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Nenhum atendimento encontrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Usuário', 'CPF', 'Tipo', 'Origem', 'Atendente', 'Data', 'Obs'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atendimentos.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.usuarios?.nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{formatarCPF(a.usuarios?.cpf)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.tipos_atendimento?.descricao || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{a.origens_atendimento?.descricao || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{a.atendentes?.nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {format(new Date(a.data_atendimento), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{a.observacoes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
