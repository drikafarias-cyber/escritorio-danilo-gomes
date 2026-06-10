'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const FOTO_DANILO = "https://nzufgqdiwgolgzgvarll.supabase.co/storage/v1/object/public/danilo%20imagem/ChatGPT%20Image%2017%20de%20fev.%20de%202026,%2012_58_15.png"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha inválidos.')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — foto */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src={FOTO_DANILO}
          alt="Danilo Gomes"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
        <div className="absolute bottom-10 left-10 text-white">
          <h2 className="text-3xl font-bold mb-1">Danilo Gomes</h2>
          <p className="text-white/80 text-lg">Escritório de Assessoria — Guarulhos/SP</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 lg:max-w-md bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img src={FOTO_DANILO} alt="Danilo Gomes" className="w-12 h-12 rounded-full object-cover object-top" />
            <div>
              <p className="font-bold text-gray-800">Danilo Gomes</p>
              <p className="text-xs text-gray-400">Sistema de Gestão</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4">
              DG
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Bem-vindo!</h1>
            <p className="text-gray-400 mt-1 text-sm">Entre com suas credenciais para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {erro && (
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/auth/solicitar-acesso" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              Não tem acesso? Solicite aqui →
            </a>
          </div>

          <p className="text-center text-xs text-gray-300 mt-8">
            Escritório Danilo Gomes © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
