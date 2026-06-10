'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft, Search, UserPlus, Printer, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface Inscricao {
  id: string
  status: string
  posicao_espera: number
  data_inscricao: string
  autorizado_sair_sozinho: boolean
  nome_assessor: string
  usuarios: { id: string; nome: string; cpf: string; telefone: string; whatsapp: string }
  dependentes: { id: string; nome: string; data_nascimento: string; quem_pode_retirar: string;
    responsavel: { nome: string; telefone: string; whatsapp: string } }
}

interface Curso {
  id: string; nome: string; professor: string; local: string
  dia_semana: string; horario_inicio: string; horario_fim: string
  vagas_total: number; vagas_disponiveis: number; data_inicio: string; data_fim: string
}

interface ResultadoBusca {
  tipo: 'usuario' | 'dependente'
  id: string; nome: string; info: string
  responsavel_nome?: string; responsavel_tel?: string
}

export default function CursoDetalhe({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [curso, setCurso] = useState<Curso | null>(null)
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<ResultadoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [autorizadoSair, setAutorizadoSair] = useState(false)

  useEffect(() => { carregar() }, [params.id])

  async function carregar() {
    setLoading(true)
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('cursos').select('*').eq('id', params.id).single(),
      supabase.from('inscricoes').select(`
        id, status, posicao_espera, data_inscricao, autorizado_sair_sozinho, nome_assessor,
        usuarios(id, nome, cpf, telefone, whatsapp),
        dependentes(id, nome, data_nascimento, quem_pode_retirar,
          responsavel:responsavel_id(nome, telefone, whatsapp))
      `).eq('curso_id', params.id).neq('status', 'cancelado').order('data_inscricao')
    ])
    setCurso(c)
    setInscricoes((i || []) as unknown as Inscricao[])
    setLoading(false)
  }

  async function buscarPessoa() {
    if (!busca.trim()) return
    setBuscando(true)
    setResultadosBusca([])

    const resultados: ResultadoBusca[] = []

    // Busca usuários adultos
    const { data: usuarios } = await supabase.from('usuarios').select('id, nome, cpf, telefone')
      .ilike('nome', `%${busca}%`).eq('ativo', true).limit(5)

    for (const u of (usuarios || [])) {
      resultados.push({ tipo: 'usuario', id: u.id, nome: u.nome, info: `CPF: ${u.cpf}` })
    }

    // Busca dependentes
    const { data: deps } = await supabase.from('dependentes')
      .select('id, nome, data_nascimento, responsavel:responsavel_id(nome, telefone, whatsapp)')
      .ilike('nome', `%${busca}%`).eq('ativo', true).limit(5)

    for (const d of (deps || [])) {
      const resp = d.responsavel as unknown as { nome: string; telefone: string }
      resultados.push({
        tipo: 'dependente', id: d.id, nome: d.nome,
        info: `Dependente · Resp: ${resp?.nome || 'N/A'}`,
        responsavel_nome: resp?.nome, responsavel_tel: resp?.telefone
      })
    }

    setResultadosBusca(resultados)
    setBuscando(false)
  }

  async function inscrever(pessoa: ResultadoBusca) {
    const confirmados = inscricoes.filter(i => i.status === 'confirmado').length
    const naLista = confirmados >= (curso?.vagas_total || 0)
    const status = naLista ? 'lista_espera' : 'confirmado'
    const posicao = naLista ? inscricoes.filter(i => i.status === 'lista_espera').length + 1 : null

    // Verifica se já está inscrito
    const jaInscrito = inscricoes.some(i =>
      (pessoa.tipo === 'usuario' && i.usuarios?.id === pessoa.id) ||
      (pessoa.tipo === 'dependente' && i.dependentes?.id === pessoa.id)
    )
    if (jaInscrito) { toast.error('Esta pessoa já está inscrita neste curso!'); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: atendente } = await supabase.from('atendentes').select('nome').eq('email', user?.email).single()

    const inscricaoData: Record<string, unknown> = {
      curso_id: params.id,
      status,
      posicao_espera: posicao,
      inscrito_por: user?.id,
      nome_assessor: atendente?.nome || user?.email,
      autorizado_sair_sozinho: autorizadoSair,
    }
    if (pessoa.tipo === 'usuario') inscricaoData.usuario_id = pessoa.id
    else inscricaoData.dependente_id = pessoa.id

    const { error } = await supabase.from('inscricoes').insert(inscricaoData)
    if (error) { toast.error(`Erro: ${error.message}`); return }

    if (status === 'confirmado') {
      await supabase.from('cursos').update({ vagas_disponiveis: (curso?.vagas_disponiveis || 1) - 1 }).eq('id', params.id)
      toast.success(`${pessoa.nome} inscrito com sucesso! ✅`)
    } else {
      toast.success(`${pessoa.nome} adicionado à lista de espera (posição ${posicao})`)
    }

    setBusca('')
    setResultadosBusca([])
    setAutorizadoSair(false)
    carregar()
  }

  async function cancelarInscricao(inscricao: Inscricao) {
    const nome = inscricao.usuarios?.nome || inscricao.dependentes?.nome
    if (!confirm(`Cancelar inscrição de ${nome}?`)) return

    await supabase.from('inscricoes').update({ status: 'cancelado' }).eq('id', inscricao.id)
    if (inscricao.status === 'confirmado') {
      await supabase.from('cursos').update({ vagas_disponiveis: (curso?.vagas_disponiveis || 0) + 1 }).eq('id', params.id)
    }
    toast.success('Inscrição cancelada')
    carregar()
  }

  function abrirCarteirinha(inscricao: Inscricao) {
    const nome = inscricao.usuarios?.nome || inscricao.dependentes?.nome || ''
    const respNome = inscricao.dependentes?.responsavel?.nome || ''
    const respTel = inscricao.dependentes?.responsavel?.telefone || inscricao.usuarios?.telefone || ''
    const autorizado = inscricao.autorizado_sair_sozinho ? 'SIM' : 'NÃO'
    const quemRetira = inscricao.dependentes?.quem_pode_retirar || ''
    const dataFim = curso?.data_fim ? format(new Date(curso.data_fim + 'T00:00:00'), 'dd/MM/yyyy') : 'Indeterminado'

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Carteirinha — ${nome}</title>
<style>
  body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .carteirinha { width: 85mm; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .header { background: linear-gradient(135deg, #E87722, #FF9500); padding: 16px; text-align: center; color: white; }
  .header h1 { margin: 0; font-size: 14px; font-weight: bold; }
  .header p { margin: 4px 0 0; font-size: 11px; opacity: 0.9; }
  .logo { width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-weight: bold; color: #E87722; font-size: 14px; }
  .body { padding: 14px; }
  .field { margin-bottom: 10px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; }
  .field:last-child { border-bottom: none; }
  .label { font-size: 9px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 2px; }
  .value { font-size: 12px; font-weight: 600; color: #333; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: bold; }
  .badge-sim { background: #d4edda; color: #155724; }
  .badge-nao { background: #f8d7da; color: #721c24; }
  .footer { background: #f8f9fa; padding: 10px 14px; text-align: center; }
  .footer p { margin: 0; font-size: 9px; color: #999; }
  @media print { body { background: white; } .carteirinha { box-shadow: none; } }
</style>
</head>
<body>
<div class="carteirinha">
  <div class="header">
    <div class="logo">DG</div>
    <h1>Escritório Danilo Gomes</h1>
    <p>Carteirinha de Aluno</p>
  </div>
  <div class="body">
    <div class="field">
      <div class="label">Nome do aluno</div>
      <div class="value">${nome}</div>
    </div>
    <div class="field">
      <div class="label">Curso</div>
      <div class="value">${curso?.nome || ''}</div>
    </div>
    <div class="field">
      <div class="label">Professor</div>
      <div class="value">${curso?.professor || ''}</div>
    </div>
    <div class="field">
      <div class="label">Horário</div>
      <div class="value">${curso?.dia_semana || ''} · ${curso?.horario_inicio?.slice(0,5) || ''} às ${curso?.horario_fim?.slice(0,5) || ''}</div>
    </div>
    ${respNome ? `<div class="field">
      <div class="label">Responsável</div>
      <div class="value">${respNome}</div>
    </div>` : ''}
    ${respTel ? `<div class="field">
      <div class="label">Telefone para contato</div>
      <div class="value">${respTel}</div>
    </div>` : ''}
    ${quemRetira ? `<div class="field">
      <div class="label">Autorizado a retirar</div>
      <div class="value">${quemRetira}</div>
    </div>` : ''}
    <div class="field">
      <div class="label">Autorizado a sair sozinho</div>
      <div class="value"><span class="badge ${inscricao.autorizado_sair_sozinho ? 'badge-sim' : 'badge-nao'}">${autorizado}</span></div>
    </div>
    <div class="field">
      <div class="label">Validade</div>
      <div class="value">${dataFim}</div>
    </div>
  </div>
  <div class="footer">
    <p>Escritório Danilo Gomes — Guarulhos/SP</p>
    <p>Emitido em ${format(new Date(), 'dd/MM/yyyy')}</p>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body></html>`

    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()
  }

  const confirmados = inscricoes.filter(i => i.status === 'confirmado')
  const espera = inscricoes.filter(i => i.status === 'lista_espera')

  if (loading) return <div className="text-center py-12 text-gray-400">Carregando...</div>
  if (!curso) return <div className="text-center py-12 text-gray-400">Curso não encontrado</div>

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header do curso */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{curso.nome}</h2>
            <p className="text-sm text-gray-400">{curso.professor} · {curso.local}</p>
            <p className="text-sm text-gray-400">{curso.dia_semana} · {curso.horario_inicio?.slice(0,5)} às {curso.horario_fim?.slice(0,5)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">{confirmados.length}/{curso.vagas_total}</p>
            <p className="text-xs text-gray-400">inscritos</p>
            {espera.length > 0 && <p className="text-xs text-yellow-600 mt-1">{espera.length} na fila de espera</p>}
          </div>
        </div>
      </div>

      {/* Busca para inscrever */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Inscrever aluno</h3>
        <div className="flex gap-3 mb-3">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarPessoa()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Buscar por nome do aluno ou dependente..." />
          <button onClick={buscarPessoa} disabled={buscando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60">
            <Search size={15} /> Buscar
          </button>
        </div>

        {/* Autorização */}
        <div className="flex items-center gap-2 mb-3">
          <input type="checkbox" id="autorizado" checked={autorizadoSair}
            onChange={e => setAutorizadoSair(e.target.checked)} className="w-4 h-4 accent-orange-500" />
          <label htmlFor="autorizado" className="text-sm text-gray-600">Autorizado a sair sozinho</label>
        </div>

        {/* Resultados */}
        {resultadosBusca.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {resultadosBusca.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.nome}</p>
                  <p className="text-xs text-gray-400">{r.info}</p>
                </div>
                <button onClick={() => inscrever(r)}
                  className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg">
                  <UserPlus size={13} /> Inscrever
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de inscritos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Inscritos confirmados ({confirmados.length})</h3>
        </div>
        {confirmados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum inscrito ainda</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Nome</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Responsável</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Sai sozinho</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Assessor</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {confirmados.map(i => (
                <tr key={i.id} className="border-b border-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">
                    {i.usuarios?.nome || i.dependentes?.nome}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {i.dependentes?.responsavel?.nome || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${i.autorizado_sair_sozinho ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {i.autorizado_sair_sozinho ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">{i.nome_assessor || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirCarteirinha(i)}
                        className="text-orange-500 hover:bg-orange-50 p-1.5 rounded-lg" title="Imprimir carteirinha">
                        <Printer size={15} />
                      </button>
                      <button onClick={() => cancelarInscricao(i)}
                        className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg text-xs">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lista de espera */}
      {espera.length > 0 && (
        <div className="bg-white rounded-xl border border-yellow-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-yellow-100 bg-yellow-50">
            <h3 className="font-semibold text-yellow-800">Lista de espera ({espera.length})</h3>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Posição</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Nome</th>
              <th className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-3">Data inscrição</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody>
              {espera.map(i => (
                <tr key={i.id} className="border-b border-gray-50">
                  <td className="px-5 py-3"><span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">{i.posicao_espera}º</span></td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{i.usuarios?.nome || i.dependentes?.nome}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{format(new Date(i.data_inscricao), 'dd/MM/yyyy')}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => cancelarInscricao(i)} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
