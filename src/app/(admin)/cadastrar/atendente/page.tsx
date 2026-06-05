'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Pencil, Check, X } from 'lucide-react'

interface Atendente { id: string; nome: string; email: string; telefone: string; ativo: boolean }

export default function Atendentes() {
  const [atendentes, setAtendentes] = useState<Atendente[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [novo, setNovo] = useState({ nome: '', email: '', telefone: '' })
  const [editando, setEditando] = useState({ nome: '', email: '', telefone: '' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('atendentes').select('*').order('nome')
    setAtendentes(data || [])
    setLoading(false)
  }

  async function adicionar() {
    if (!novo.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSalvando(true)

    const { error } = await supabase.from('atendentes').insert({
      nome: novo.nome.trim(),
      email: novo.email.trim() || null,
      telefone: novo.telefone.trim() || null,
    })

    if (error) {
      toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Atendente cadastrado!')
      setNovo({ nome: '', email: '', telefone: '' })
      carregar()
    }
    setSalvando(false)
  }

  async function salvarEdicao(id: string) {
    if (!editando.nome.trim()) { toast.error('Nome é obrigatório'); return }

    const { error } = await supabase.from('atendentes').update({
      nome: editando.nome.trim(),
      email: editando.email.trim() || null,
      telefone: editando.telefone.trim() || null,
    }).eq('id', id)

    if (error) {
      toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Atendente atualizado!')
      setEditandoId(null)
      carregar()
    }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await supabase.from('atendentes').update({ ativo: !ativo }).eq('id', id)
    carregar()
  }

  function iniciarEdicao(a: Atendente) {
    setEditandoId(a.id)
    setEditando({ nome: a.nome, email: a.email || '', telefone: a.telefone || '' })
  }

  return (
    <div className="max-w-3xl">
      {/* Formulário novo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Novo atendente</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome *</label>
            <input value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-mail</label>
            <input type="email" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefone</label>
            <input value={novo.telefone} onChange={e => setNovo(p => ({ ...p, telefone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="(11) 99999-9999" />
          </div>
        </div>
        <button onClick={adicionar} disabled={salvando}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
          <Plus size={16} /> Cadastrar atendente
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">Carregando...</p>
        ) : atendentes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Nenhum atendente cadastrado</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">E-mail</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {atendentes.map(a => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="px-5 py-3">
                    {editandoId === a.id ? (
                      <input value={editando.nome} onChange={e => setEditando(p => ({ ...p, nome: e.target.value }))}
                        className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-full" />
                    ) : (
                      <span className="text-sm font-medium text-gray-800">{a.nome}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {editandoId === a.id ? (
                      <input value={editando.email} onChange={e => setEditando(p => ({ ...p, email: e.target.value }))}
                        className="border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none w-full" />
                    ) : (
                      <span className="text-sm text-gray-400">{a.email || '—'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleAtivo(a.id, a.ativo)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {a.ativo ? '● Ativo' : '○ Inativo'}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editandoId === a.id ? (
                        <>
                          <button onClick={() => salvarEdicao(a.id)}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg"><Check size={15} /></button>
                          <button onClick={() => setEditandoId(null)}
                            className="text-gray-400 hover:bg-gray-50 p-1.5 rounded-lg"><X size={15} /></button>
                        </>
                      ) : (
                        <button onClick={() => iniciarEdicao(a)}
                          className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 p-1.5 rounded-lg"><Pencil size={15} /></button>
                      )}
                    </div>
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
