'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface Tipo { id: string; descricao: string; ativo: boolean; created_at: string }

export default function TipoAtendimento() {
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [novoTipo, setNovoTipo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('tipos_atendimento')
      .select('*')
      .order('descricao')
    setTipos(data || [])
    setLoading(false)
  }

  async function adicionar() {
    if (!novoTipo.trim()) { toast.error('Digite a descrição do tipo'); return }
    setSalvando(true)

    const { error } = await supabase
      .from('tipos_atendimento')
      .insert({ descricao: novoTipo.trim() })

    if (error) {
      error.code === '23505'
        ? toast.error('Esse tipo já existe')
        : toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Tipo cadastrado!')
      setNovoTipo('')
      carregar()
    }
    setSalvando(false)
  }

  async function remover(id: string, descricao: string) {
    if (!confirm(`Remover "${descricao}"?`)) return

    const { error } = await supabase
      .from('tipos_atendimento')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Tipo removido')
      carregar()
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex gap-3 mb-5">
          <input
            value={novoTipo}
            onChange={e => setNovoTipo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionar()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Novo tipo de atendimento..."
          />
          <button
            onClick={adicionar}
            disabled={salvando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
        ) : tipos.filter(t => t.ativo).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum tipo cadastrado ainda</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide py-2">Descrição</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide py-2">Cadastrado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tipos.filter(t => t.ativo).map(t => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="py-3 text-sm text-gray-800">{t.descricao}</td>
                  <td className="py-3 text-sm text-gray-400">{format(new Date(t.created_at), 'dd/MM/yyyy')}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => remover(t.id, t.descricao)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
