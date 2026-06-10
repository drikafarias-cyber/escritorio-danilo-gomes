'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, X } from 'lucide-react'
import { format } from 'date-fns'

interface Inscricao {
  id: string
  usuarios: { nome: string }
  dependentes: { nome: string }
}

interface Presenca {
  inscricao_id: string
  presente: boolean
}

export default function PresencaPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [curso, setCurso] = useState<{ nome: string; professor: string } | null>(null)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [presencas, setPresencas] = useState<Record<string, boolean>>({})
  const [dataAula, setDataAula] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [professor, setProfessor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [params.id])
  useEffect(() => { if (dataAula) carregarPresencasExistentes() }, [dataAula])

  async function carregar() {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('cursos').select('nome, professor').eq('id', params.id).single(),
      supabase.from('inscricoes').select('id, usuarios(nome), dependentes(nome)')
        .eq('curso_id', params.id).eq('status', 'confirmado').order('data_inscricao')
    ])
    setCurso(c)
    setProfessor(c?.professor || '')
    setInscricoes((i || []) as unknown as Inscricao[])
    setLoading(false)
  }

  async function carregarPresencasExistentes() {
    const { data } = await supabase.from('presencas')
      .select('inscricao_id, presente')
      .eq('curso_id', params.id)
      .eq('data_aula', dataAula)

    const map: Record<string, boolean> = {}
    for (const p of (data || [])) {
      map[p.inscricao_id] = p.presente
    }
    setPresencas(map)
  }

  function togglePresenca(inscricaoId: string) {
    setPresencas(p => ({ ...p, [inscricaoId]: !p[inscricaoId] }))
  }

  async function salvarPresencas() {
    if (!professor.trim()) { toast.error('Informe o nome do professor'); return }
    setSalvando(true)

    const registros = inscricoes.map(i => ({
      curso_id: params.id,
      inscricao_id: i.id,
      data_aula: dataAula,
      presente: presencas[i.id] || false,
      registrado_por: professor,
    }))

    const { error } = await supabase.from('presencas').upsert(registros, {
      onConflict: 'inscricao_id,data_aula'
    })

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
    } else {
      toast.success('Presenças salvas com sucesso!')
    }
    setSalvando(false)
  }

  const totalPresentes = Object.values(presencas).filter(Boolean).length

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="font-bold text-gray-800 text-lg">{curso?.nome}</h2>
        <p className="text-sm text-gray-400 mb-4">Lista de presença</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data da aula</label>
            <input type="date" value={dataAula} onChange={e => setDataAula(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Professor responsável</label>
            <input value={professor} onChange={e => setProfessor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nome do professor" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">{totalPresentes} de {inscricoes.length} presentes</p>
          <div className="flex gap-2">
            <button onClick={() => {
              const todos: Record<string, boolean> = {}
              inscricoes.forEach(i => { todos[i.id] = true })
              setPresencas(todos)
            }} className="text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg border border-green-200">
              Todos presentes
            </button>
            <button onClick={() => setPresencas({})} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg border border-red-200">
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        {inscricoes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum aluno inscrito</p>
        ) : (
          <div>
            {inscricoes.map((i, idx) => {
              const nome = i.usuarios?.nome || i.dependentes?.nome || ''
              const presente = presencas[i.id] || false
              return (
                <div key={i.id}
                  onClick={() => togglePresenca(i.id)}
                  className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
                    presente ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                    <p className="text-sm font-medium text-gray-800">{nome}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    presente ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {presente ? <Check size={16} /> : <X size={16} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={salvarPresencas} disabled={salvando}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60">
        {salvando ? 'Salvando...' : '✅ Salvar presenças'}
      </button>
    </div>
  )
}
