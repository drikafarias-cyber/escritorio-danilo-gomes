// Integração com ViaCEP - gratuito, sem API key
// Docs: https://viacep.com.br/

export interface EnderecoViaCEP {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  erro?: boolean
}

export interface ResultadoBusca {
  sucesso: boolean
  endereco?: EnderecoViaCEP
  erro?: string
}

// Busca endereço pelo CEP
export async function buscarCEP(cep: string): Promise<ResultadoBusca> {
  const cepLimpo = cep.replace(/\D/g, '')

  if (cepLimpo.length !== 8) {
    return { sucesso: false, erro: 'CEP deve ter 8 dígitos' }
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data: EnderecoViaCEP = await res.json()

    if (data.erro) {
      return { sucesso: false, erro: 'CEP não encontrado' }
    }

    return { sucesso: true, endereco: data }
  } catch {
    return { sucesso: false, erro: 'Erro ao consultar CEP. Verifique sua conexão.' }
  }
}

// Formata CEP para exibição: 01310100 → 01310-100
export function formatarCEP(cep: string): string {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return cep
  return `${limpo.slice(0, 5)}-${limpo.slice(5)}`
}

// Formata CPF: 12345678900 → 123.456.789-00
export function formatarCPF(cpf: string): string {
  const limpo = cpf.replace(/\D/g, '')
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Formata telefone: 11999998888 → (11) 99999-8888
export function formatarTelefone(tel: string): string {
  const limpo = tel.replace(/\D/g, '')
  if (limpo.length === 11) return limpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (limpo.length === 10) return limpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}
