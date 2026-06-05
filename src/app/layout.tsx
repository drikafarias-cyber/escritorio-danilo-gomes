import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Escritório Danilo Gomes — Sistema de Gestão',
  description: 'Sistema de gestão de atendimentos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
