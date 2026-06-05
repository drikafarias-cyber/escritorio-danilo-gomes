'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Search, MessageSquare } from 'lucide-react'

interface Usuario {
  id: string
  nome: string
  cpf: string
  telefone: string
  whatsapp: string
  data_nascimento: string
  cidade: string
  estado: string
  created_at: string
}

export default function ConsultarUsuarios() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscou, setBuscou] = useState(false)

  async function buscar() {
    if (!busca.trim()) return
    setBuscando(true)
    setBuscou(true)

    const termo = busca.replace(/\D/g, '').length > 5
      ? busca.replace(/\D/g, '') // CPF
      : busca.trim() // Nome

    let query = supabase.from('usuarios').select('*').eq('ativo', true).limit(50)

    if (/^\d+$/.test(termo) && termo.length >= 6) {
      query = query.ilike('cpf', `%${termo}%`)
    } else {
      query = query.ilike('nome', `%${termo}%`)
    }

    const { data, error } = await query.order('nome')

    if (error) {
      toast.error('Erro ao buscar usuários')
    } else {
      setResultados(data || [])
    }
    setBuscando(false)
  }

  async function enviarMensagem(usuario: Usuario) {
    const numero = usuario.whatsapp || usuario.telefone
    if (!numero) { toast.error('Usuário sem telefone cadastrado'); return }

    const msg = prompt(`Mensagem para ${usuario.nome.split(' ')[0]}:`)
    if (!msg) return

    const res = await fetch('/api/notificacoes/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: usuario.id,
        telefone: numero,
        tipo: 'manual',
        mensagem_template: msg,
        variaveis: {},
      }),
    })
    const r = await res.json()
    r.sucesso ? toast.success('Mensagem enviada!') : toast.error(`Erro: ${r.erro}`)
  }

  function formatarCPF(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  return (
    <div className="max-w-5xl">
      {/* Busca */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Buscar por nome ou CPF..."
          />
          <button
            onClick={buscar}
            disabled={buscando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
          >
            <Search size={16} />
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {buscou && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {resultados.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum usuário encontrado</p>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
                {resultados.length} resultado(s)
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">CPF</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Nascimento</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Telefone</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Cidade</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">{u.nome}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{formatarCPF(u.cpf)}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {u.data_nascimento ? format(new Date(u.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.telefone || u.whatsapp || '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{u.cidade ? `${u.cidade}/${u.estado}` : '-'}</td>
                      <td className="px-5 py-3">
                        {(u.whatsapp || u.telefone) && (
                          <button
                            onClick={() => enviarMensagem(u)}
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg"
                          >
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
