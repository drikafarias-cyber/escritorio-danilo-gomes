'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Users, Clock, MapPin, Edit, BookOpen } from 'lucide-react'

interface Curso {
  id: string
  nome: string
  descricao: string
  professor: string
  local: string
  dia_semana: string
  horario_inicio: string
  horario_fim: string
  vagas_total: number
  vagas_disponiveis: number
  faixa_etaria_min: number
  faixa_etaria_max: number
  permite_adultos: boolean
  ativo: boolean
}

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [form, setForm] = useState({
    nome: '', descricao: '', professor: '', local: '',
    dia_semana: '', horario_inicio: '', horario_fim: '',
    vagas_total: 0, faixa_etaria_min: 0, faixa_etaria_max: 99,
    permite_adultos: false, data_inicio: '', data_fim: ''
  })
  const router = useRouter()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('cursos').select('*').eq('ativo', true).order('nome')
    setCursos(data || [])
    setLoading(false)
  }

  async function salvarCurso() {
    if (!form.nome || !form.professor) { toast.error('Nome e professor são obrigatórios'); return }
    const { error } = await supabase.from('cursos').insert({
      ...form,
      vagas_disponiveis: form.vagas_total,
    })
    if (error) { toast.error(`Erro: ${error.message}`); return }
    toast.success('Curso criado!')
    setCriando(false)
    setForm({ nome: '', descricao: '', professor: '', local: '', dia_semana: '', horario_inicio: '', horario_fim: '', vagas_total: 0, faixa_etaria_min: 0, faixa_etaria_max: 99, permite_adultos: false, data_inicio: '', data_fim: '' })
    carregar()
  }

  async function desativar(id: string) {
    if (!confirm('Desativar este curso?')) return
    await supabase.from('cursos').update({ ativo: false }).eq('id', id)
    toast.success('Curso desativado')
    carregar()
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-400">{cursos.length} curso(s) ativo(s)</p>
        <button onClick={() => setCriando(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Novo curso
        </button>
      </div>

      {/* Formulário novo curso */}
      {criando && (
        <div className="bg-white rounded-xl border border-orange-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Novo curso</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs text-gray-500 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm(p => ({...p, nome: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nome do curso" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Professor *</label>
              <input value={form.professor} onChange={e => setForm(p => ({...p, professor: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nome do professor" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><label className="block text-xs text-gray-500 mb-1">Local</label>
              <input value={form.local} onChange={e => setForm(p => ({...p, local: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Sala, quadra..." /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Dias da semana</label>
              <input value={form.dia_semana} onChange={e => setForm(p => ({...p, dia_semana: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Ex: Terça e Quinta" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Vagas</label>
              <input type="number" value={form.vagas_total} onChange={e => setForm(p => ({...p, vagas_total: Number(e.target.value)}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div><label className="block text-xs text-gray-500 mb-1">Horário início</label>
              <input type="time" value={form.horario_inicio} onChange={e => setForm(p => ({...p, horario_inicio: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Horário fim</label>
              <input type="time" value={form.horario_fim} onChange={e => setForm(p => ({...p, horario_fim: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Idade mín.</label>
              <input type="number" value={form.faixa_etaria_min} onChange={e => setForm(p => ({...p, faixa_etaria_min: Number(e.target.value)}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Idade máx.</label>
              <input type="number" value={form.faixa_etaria_max} onChange={e => setForm(p => ({...p, faixa_etaria_max: Number(e.target.value)}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs text-gray-500 mb-1">Data início</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(p => ({...p, data_inicio: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Data fim</label>
              <input type="date" value={form.data_fim} onChange={e => setForm(p => ({...p, data_fim: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({...p, descricao: e.target.value}))}
              rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <input type="checkbox" id="permite_adultos" checked={form.permite_adultos}
              onChange={e => setForm(p => ({...p, permite_adultos: e.target.checked}))} className="w-4 h-4 accent-orange-500" />
            <label htmlFor="permite_adultos" className="text-sm text-gray-600">Permite inscrição de adultos</label>
          </div>
          <div className="flex gap-2">
            <button onClick={salvarCurso} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Salvar curso</button>
            <button onClick={() => setCriando(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de cursos */}
      {loading ? <p className="text-gray-400 text-center py-12">Carregando...</p> : (
        <div className="grid grid-cols-2 gap-4">
          {cursos.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.nome}</h3>
                  <p className="text-sm text-gray-400">{c.professor}</p>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  c.vagas_disponiveis > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {c.vagas_disponiveis > 0 ? `${c.vagas_disponiveis} vagas` : 'Sem vagas'}
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                {c.local && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={12} /> {c.local}</p>}
                {c.dia_semana && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Clock size={12} /> {c.dia_semana} · {c.horario_inicio?.slice(0,5)} às {c.horario_fim?.slice(0,5)}</p>}
                <p className="text-xs text-gray-500 flex items-center gap-1.5"><Users size={12} /> {c.vagas_total - c.vagas_disponiveis}/{c.vagas_total} inscritos · {c.faixa_etaria_min}-{c.faixa_etaria_max} anos</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => router.push(`/cursos/${c.id}`)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                  <BookOpen size={13} /> Gerenciar
                </button>
                <button onClick={() => router.push(`/cursos/${c.id}/presenca`)}
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                  <Users size={13} /> Presença
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
