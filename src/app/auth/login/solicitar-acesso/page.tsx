'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SolicitarAcesso() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', confirmar_senha: '' })
  const [salvando, setSalvando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.nome || !form.email || !form.senha) {
      setErro('Preencha todos os campos obrigatórios')
      return
    }
    if (form.senha !== form.confirmar_senha) {
      setErro('As senhas não coincidem')
      return
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setSalvando(true)

    // Verifica se já existe solicitação para esse email
    const { data: existente } = await supabase
      .from('solicitacoes_acesso')
      .select('id, status')
      .eq('email', form.email)
      .single()

    if (existente) {
      if (existente.status === 'pendente') {
        setErro('Já existe uma solicitação pendente para este e-mail. Aguarde a aprovação.')
      } else if (existente.status === 'aprovado') {
        setErro('Este e-mail já foi aprovado. Acesse o sistema normalmente.')
      } else {
        setErro('Esta solicitação foi reprovada. Entre em contato com o administrador.')
      }
      setSalvando(false)
      return
    }

    // Salva a solicitação
    const { error } = await supabase.from('solicitacoes_acesso').insert({
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase(),
      telefone: form.telefone.trim() || null,
      senha_temp: form.senha, // guardamos temporariamente para o admin criar o usuário
    })

    if (error) {
      setErro('Erro ao enviar solicitação. Tente novamente.')
      setSalvando(false)
      return
    }

    setEnviado(true)
    setSalvando(false)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Solicitação enviada!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Sua solicitação foi recebida e está aguardando aprovação do administrador.
            Você receberá um contato quando for aprovado.
          </p>
          <a href="/auth/login"
            className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            ← Voltar ao login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg">
            DG
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Solicitar acesso</h1>
          <p className="text-sm text-gray-400 mt-1">Escritório Danilo Gomes</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Celular</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Senha *</label>
              <input
                type="password"
                value={form.senha}
                onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Confirmar senha *</label>
              <input
                type="password"
                value={form.confirmar_senha}
                onChange={e => setForm(p => ({ ...p, confirmar_senha: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Repita a senha"
                required
              />
            </div>

            {erro && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {salvando ? 'Enviando...' : 'Solicitar acesso'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Já tem acesso?{' '}
          <a href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}

