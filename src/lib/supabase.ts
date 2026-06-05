import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  usuarios: {
    id: string
    nome: string
    cpf: string
    rg?: string
    data_nascimento: string
    titulo_eleitoral?: string
    telefone?: string
    whatsapp?: string
    cep?: string
    endereco?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    ativo: boolean
    created_at: string
    updated_at: string
  }
  atendentes: {
    id: string
    nome: string
    email?: string
    telefone?: string
    ativo: boolean
    created_at: string
  }
  tipos_atendimento: {
    id: string
    descricao: string
    ativo: boolean
    created_at: string
  }
  atendimentos: {
    id: string
    usuario_id: string
    atendente_id?: string
    tipo_id?: string
    origem_id?: string
    observacoes?: string
    data_atendimento: string
    created_at: string
  }
}
