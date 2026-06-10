'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Search, Plus, X, User } from 'lucide-react'

interface Responsavel {
  id: string; nome: string; cpf: string; telefone: string
}

interface Dependente {
  id: string; nome: string; data_nascimento: string
  escola: string; periodo_escolar: string
  tem_deficiencia: boolean; descricao_deficiencia: string
  quem_pode_retirar: string; observacoes: string
  responsavel_id: string
  usuarios: { nome: string; telefone: string }
}

export default function DependentesPage() {
  const [busca, setBusca] = useState('')
  const [responsavel, setResponsavel] = useState<Responsavel | null>(null)
  const [dependentes, setDependentes] = useState<Dependente[]>([])
  const [resultados, setResultados] = useState<Responsavel[]>([])
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '', data_nascimento: '', escola: '', periodo_escolar: 'manhã',
    tem_deficiencia: false, descricao_deficiencia: '', quem_pode_retirar: '', observacoes: ''
  })

  async function buscarResponsavel() {
    if (!busca.trim()) return
    const { data } = await supabase.from('usuarios').select('id, nome, cpf, telefone')
      .ilike('nome', `%${busca}%`).eq('ativo', true).limit(5)
    setResultados(data || [])
  }

  async function selecionarResponsavel(r: Responsavel) {
    setResponsavel(r)
    setResultados([])
    setBusca('')
    const { data } = await supabase.from('dependentes')
      .select('*, usuarios:responsavel_id(nome, telefone)')
      .eq('responsavel_id', r.id).eq('ativo', true)
    setDependentes((data || []) as unknown as Dependente[])
  }

  async function salvarDependente() {
    if (!responsavel) return
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setSalvando(true)

    const { error } = await supabase.from('dependentes').insert({
      responsavel_id: responsavel.id,
      nome: form.nome.trim(),
      data_nascimento: form.data_nascimento || null,
      escola: form.escola || null,
      periodo_escolar: form.periodo_escolar || null,
      tem_deficiencia: form.tem_deficiencia,
      descricao_deficiencia: form.descricao_deficiencia || null,
      quem_pode_retirar: form.quem_pode_retirar || null,
      observacoes: form.observacoes || null,
    })

    if (error) {
      toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Dependente cadastrado!')
      setCriando(false)
      setForm({ nome: '', data_nascimento: '', escola: '', periodo_escolar: 'manhã', tem_deficiencia: false, descricao_deficiencia: '', quem_pode_retirar: '', observacoes: '' })
      selecionarResponsavel(responsavel)
    }
    setSalvando(false)
  }

  async function remover(id: string, nome: string) {
    if (!confirm(`Remover ${nome}?`)) return
    await supabase.from('dependentes').update({ ativo: false }).eq('id', id)
    toast.success('Dependente removido')
    if (responsavel) selecionarResponsavel(responsavel)
  }

  function calcularIdade(dataNasc: string) {
    if (!dataNasc) return ''
    const hoje = new Date()
    const nasc = new Date(dataNasc + 'T00:00:00')
    let idade = hoje.getFullYear() - nasc.getFullYear()
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--
    return `${idade} anos`
  }

  return (
    <div className="max-w-3xl">
      {/* Busca de responsável */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Buscar responsável</h2>
        <div className="flex gap-3 mb-3">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarResponsavel()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Nome do pai ou mãe..." />
          <button onClick={buscarResponsavel}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2">
            <Search size={15} /> Buscar
          </button>
        </div>

        {resultados.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {resultados.map(r => (
              <div key={r.id} onClick={() => selecionarResponsavel(r)}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-orange-50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.nome}</p>
                  <p className="text-xs text-gray-400">CPF: {r.cpf} · {r.telefone}</p>
                </div>
                <span className="text-xs text-orange-500">Selecionar →</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dependentes do responsável selecionado */}
      {responsavel && (
        <>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                {responsavel.nome.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{responsavel.nome}</p>
                <p className="text-xs text-gray-500">{responsavel.telefone}</p>
              </div>
            </div>
            <button onClick={() => setCriando(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
              <Plus size={15} /> Adicionar dependente
            </button>
          </div>

          {/* Formulário novo dependente */}
          {criando && (
            <div className="bg-white rounded-xl border border-orange-200 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Novo dependente</h3>
                <button onClick={() => setCriando(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="block text-xs text-gray-500 mb-1">Nome completo *</label>
                  <input value={form.nome} onChange={e => setForm(p => ({...p, nome: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Data de nascimento</label>
                  <input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({...p, data_nascimento: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="block text-xs text-gray-500 mb-1">Escola</label>
                  <input value={form.escola} onChange={e => setForm(p => ({...p, escola: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nome da escola" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Período</label>
                  <select value={form.periodo_escolar} onChange={e => setForm(p => ({...p, periodo_escolar: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="manhã">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                    <option value="integral">Integral</option>
                  </select></div>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Quem pode retirar</label>
                <input value={form.quem_pode_retirar} onChange={e => setForm(p => ({...p, quem_pode_retirar: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nomes das pessoas autorizadas a retirar" /></div>
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" id="deficiencia" checked={form.tem_deficiencia}
                  onChange={e => setForm(p => ({...p, tem_deficiencia: e.target.checked}))} className="w-4 h-4 accent-orange-500" />
                <label htmlFor="deficiencia" className="text-sm text-gray-600">Possui deficiência ou necessidade especial</label>
              </div>
              {form.tem_deficiencia && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                  <input value={form.descricao_deficiencia} onChange={e => setForm(p => ({...p, descricao_deficiencia: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
              )}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(p => ({...p, observacoes: e.target.value}))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" /></div>
              <button onClick={salvarDependente} disabled={salvando}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Salvar dependente'}
              </button>
            </div>
          )}

          {/* Lista de dependentes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Dependentes ({dependentes.length})</h3>
            </div>
            {dependentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum dependente cadastrado</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {dependentes.map(d => (
                  <div key={d.id} className="px-5 py-4 flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{d.nome}</p>
                        <p className="text-xs text-gray-400">{d.data_nascimento ? calcularIdade(d.data_nascimento) : ''} {d.escola ? `· ${d.escola} (${d.periodo_escolar})` : ''}</p>
                        {d.quem_pode_retirar && <p className="text-xs text-gray-400">Retirar: {d.quem_pode_retirar}</p>}
                        {d.tem_deficiencia && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">NEE</span>}
                      </div>
                    </div>
                    <button onClick={() => remover(d.id, d.nome)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
