// Integração com Z-API para envio de WhatsApp
// Documentação: https://developer.z-api.io/

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || ''

interface ZAPIResponse {
  zaapId?: string
  messageId?: string
  id?: string
  error?: string
}

// Formata número para o padrão internacional (55 + DDD + número)
export function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '')
  if (limpo.startsWith('55')) return limpo
  if (limpo.length === 11) return `55${limpo}`
  if (limpo.length === 10) return `55${limpo}`
  return `55${limpo}`
}

// Envia mensagem de texto via WhatsApp
export async function enviarWhatsApp(
  telefone: string,
  mensagem: string
): Promise<{ sucesso: boolean; detalhes?: ZAPIResponse; erro?: string }> {
  const numero = formatarTelefone(telefone)

  try {
    const res = await fetch(`${ZAPI_BASE}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone: numero, message: mensagem }),
    })

    const data: ZAPIResponse = await res.json()

    if (!res.ok || data.error) {
      return { sucesso: false, erro: data.error || 'Erro ao enviar mensagem' }
    }

    return { sucesso: true, detalhes: data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { sucesso: false, erro: msg }
  }
}

// Verifica status da instância Z-API
export async function verificarStatus(): Promise<{ conectado: boolean; status?: string }> {
  try {
    const res = await fetch(`${ZAPI_BASE}/status`, {
      headers: { 'Client-Token': CLIENT_TOKEN },
    })
    const data = await res.json()
    return { conectado: data.connected === true, status: data.smartphoneConnected }
  } catch {
    return { conectado: false }
  }
}

// Monta mensagem substituindo variáveis como {nome}, {cpf} etc.
export function montarMensagem(template: string, variaveis: Record<string, string>): string {
  let msg = template
  for (const [chave, valor] of Object.entries(variaveis)) {
    msg = msg.replaceAll(`{${chave}}`, valor)
  }
  return msg
}
