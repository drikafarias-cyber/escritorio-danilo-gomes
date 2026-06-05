// /api/notificacoes/status
// Verifica se a instância Z-API está conectada

import { NextResponse } from 'next/server'
import { verificarStatus } from '@/lib/zapi'

export async function GET() {
  const status = await verificarStatus()
  return NextResponse.json(status)
}
