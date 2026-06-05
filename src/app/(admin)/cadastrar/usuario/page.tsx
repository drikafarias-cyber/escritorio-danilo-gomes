'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { buscarCEP, formatarCEP, formatarCPF, formatarTelefone } from '@/lib/viacep'

type FormData = {
  nome: string
  cpf: string
  rg: string
  data_nascimento: string
  titulo_eleitoral: string
  telefone: string
  whatsapp: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  enviar_wa: boolean
}

export default function CadastrarUsuario() {
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { enviar_wa: true }
  })

  const cepValue = watch('cep')
  const enviarWa = watch('enviar_wa')

  // Busca endereço pelo CEP
  async function handleBuscarCEP() {
    const cep = cepValue?.replace(/\D/g, '')
    if (!cep || cep.length < 8) {
      toast.error('Digite um CEP válido com 8 dígitos')
      return
    }

    setBuscandoCEP(true)
    const resultado = await buscarCEP(cep)
    setBuscandoCEP(false)

    if (!resultado.sucesso || !resultado.endereco) {
      toast.error(resultado.erro || 'CEP não encontrado')
      return
    }

    const { logradouro, bairro, localidade, uf } = resultado.endereco
    setValue('endereco', logradouro)
    setValue('bairro', bairro)
    setValue('cidade', localidade)
    setValue('estado', uf)
    toast.success('Endereço preenchido automaticamente!')
  }

  // Formata CPF enquanto digita
  function handleCPFChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
    setValue('cpf', formatarCPF(v))
  }

  // Formata telefone enquanto digita
  function handleTelChange(field: 'telefone' | 'whatsapp', e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
    setValue(field, formatarTelefone(v))
  }

  // Formata CEP enquanto digita
  function handleCEPChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 8)
    setValue('cep', formatarCEP(v))
  }

  async function onSubmit(data: FormData) {
    setSalvando(true)

    try {
      // 1. Salva no banco
      const { data: novoUsuario, error } = await supabase
        .from('usuarios')
        .insert({
          nome: data.nome,
          cpf: data.cpf.replace(/\D/g, ''),
          rg: data.rg || null,
          data_nascimento: data.data_nascimento,
          titulo_eleitoral: data.titulo_eleitoral || null,
          telefone: data.telefone || null,
          whatsapp: data.whatsapp || null,
          cep: data.cep?.replace(/\D/g, '') || null,
          endereco: data.endereco || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('CPF já cadastrado no sistema!')
        } else {
          toast.error(`Erro ao salvar: ${error.message}`)
        }
        setSalvando(false)
        return
      }

      toast.success(`${data.nome} cadastrado(a) com sucesso!`)

      // 2. Envia WhatsApp se solicitado
      if (data.enviar_wa && (data.whatsapp || data.telefone)) {
        const numero = data.whatsapp || data.telefone

        // Busca template de boas-vindas nas configurações
        const { data: config } = await supabase
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'msg_boas_vindas')
          .single()

        const template = config?.valor ||
          'Olá {nome}! 🎉 Bem-vindo(a) à IECE Guarulhos! Seu cadastro foi realizado com sucesso.'

        const res = await fetch('/api/notificacoes/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: novoUsuario.id,
            telefone: numero,
            tipo: 'cadastro',
            mensagem_template: template,
            variaveis: { nome: data.nome.split(' ')[0] },
          }),
        })

        const resultado = await res.json()
        if (resultado.sucesso) {
          toast.success('WhatsApp de boas-vindas enviado! 📱')
        } else {
          toast.error(`WhatsApp não enviado: ${resultado.erro}`)
        }
      }

    } catch {
      toast.error('Erro inesperado. Tente novamente.')
    }

    setSalvando(false)
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Dados pessoais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Dados pessoais
          </h2>

          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Nome completo *</label>
            <input
              {...register('nome', { required: 'Nome é obrigatório' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nome completo"
            />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">CPF *</label>
              <input
                {...register('cpf', { required: 'CPF é obrigatório' })}
                onChange={handleCPFChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">RG</label>
              <input
                {...register('rg')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="00.000.000-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data de nascimento *</label>
              <input
                type="date"
                {...register('data_nascimento', { required: 'Data de nascimento é obrigatória' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {errors.data_nascimento && <p className="text-red-500 text-xs mt-1">{errors.data_nascimento.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Título eleitoral</label>
              <input
                {...register('titulo_eleitoral')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Nr título eleitoral"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Endereço
          </h2>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-orange-600 text-sm">📍</span>
            <p className="text-orange-700 text-xs">
              Digite o CEP e clique em <strong>Buscar</strong> para preencher o endereço automaticamente
            </p>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">CEP *</label>
              <input
                {...register('cep', { required: 'CEP é obrigatório' })}
                onChange={handleCEPChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="00000-000"
                maxLength={9}
              />
              {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep.message}</p>}
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleBuscarCEP}
                disabled={buscandoCEP}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {buscandoCEP ? 'Buscando...' : '🔍 Buscar CEP'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Endereço *</label>
              <input
                {...register('endereco', { required: 'Endereço é obrigatório' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Rua/Avenida/Praça..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Número *</label>
              <input
                {...register('numero', { required: 'Número é obrigatório' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Nr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Complemento</label>
              <input
                {...register('complemento')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Apto/Casa/Andar"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Bairro *</label>
              <input
                {...register('bairro', { required: 'Bairro é obrigatório' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Bairro"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Cidade *</label>
              <input
                {...register('cidade', { required: 'Cidade é obrigatória' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Estado *</label>
              <input
                {...register('estado', { required: 'Estado é obrigatório' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Contato
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Telefone</label>
              <input
                {...register('telefone')}
                onChange={(e) => handleTelChange('telefone', e)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="(11) 0000-0000"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">WhatsApp</label>
              <input
                {...register('whatsapp')}
                onChange={(e) => handleTelChange('whatsapp', e)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          {/* Opção de enviar WhatsApp */}
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <input
              type="checkbox"
              id="enviar_wa"
              {...register('enviar_wa')}
              className="w-4 h-4 accent-green-600"
            />
            <label htmlFor="enviar_wa" className="text-sm text-green-800 cursor-pointer">
              📱 Enviar mensagem de boas-vindas via WhatsApp ao cadastrar
            </label>
          </div>
        </div>

        {/* Botão salvar */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 flex items-center gap-2"
          >
            {salvando ? '⏳ Salvando...' : '💾 Salvar cadastro'}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>
      </form>
    </div>
  )
}
