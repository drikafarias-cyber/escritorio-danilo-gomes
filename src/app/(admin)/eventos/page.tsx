'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import { format } from 'date-fns'

interface Evento {
  id: string
  titulo: string
  descricao: string
  data_evento: string
  fotos_eventos: { id: string; url_foto: string; descricao: string }[]
}

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [criarEvento, setCriarEvento] = useState(false)
  const [eventoAtivo, setEventoAtivo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [novoEvento, setNovoEvento] = useState({ titulo: '', descricao: '', data_evento: '' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('eventos')
      .select('*, fotos_eventos(id, url_foto, descricao)')
      .order('data_evento', { ascending: false })
    setEventos((data || []) as Evento[])
    setLoading(false)
  }

  async function salvarEvento() {
    if (!novoEvento.titulo.trim()) { toast.error('Título é obrigatório'); return }

    const { error } = await supabase.from('eventos').insert({
      titulo: novoEvento.titulo.trim(),
      descricao: novoEvento.descricao.trim() || null,
      data_evento: novoEvento.data_evento || null,
    })

    if (error) {
      toast.error(`Erro: ${error.message}`)
    } else {
      toast.success('Evento criado!')
      setNovoEvento({ titulo: '', descricao: '', data_evento: '' })
      setCriarEvento(false)
      carregar()
    }
  }

  async function uploadFotos(eventoId: string, files: FileList) {
    setUploading(true)
    let erros = 0

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const nomeArquivo = `${eventoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('eventos-fotos')
        .upload(nomeArquivo, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        erros++
        continue
      }

      const { data: urlData } = supabase.storage
        .from('eventos-fotos')
        .getPublicUrl(nomeArquivo)

      await supabase.from('fotos_eventos').insert({
        evento_id: eventoId,
        url_foto: urlData.publicUrl,
        descricao: file.name,
      })
    }

    if (erros > 0) {
      toast.error(`${erros} foto(s) não puderam ser enviadas`)
    } else {
      toast.success('Fotos enviadas com sucesso!')
    }
    setUploading(false)
    carregar()
  }

  async function removerFoto(fotoId: string, urlFoto: string) {
    if (!confirm('Remover esta foto?')) return

    // Remove do storage
    const path = urlFoto.split('/eventos-fotos/')[1]
    if (path) await supabase.storage.from('eventos-fotos').remove([path])

    await supabase.from('fotos_eventos').delete().eq('id', fotoId)
    toast.success('Foto removida')
    carregar()
  }

  async function removerEvento(id: string) {
    if (!confirm('Remover este evento e todas as fotos?')) return
    await supabase.from('eventos').delete().eq('id', id)
    toast.success('Evento removido')
    carregar()
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-400">{eventos.length} evento(s)</span>
        <button onClick={() => setCriarEvento(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Novo evento
        </button>
      </div>

      {/* Modal novo evento */}
      {criarEvento && (
        <div className="bg-white rounded-xl border border-orange-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Novo evento</h2>
            <button onClick={() => setCriarEvento(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Título *</label>
              <input value={novoEvento.titulo} onChange={e => setNovoEvento(p => ({ ...p, titulo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Nome do evento" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data do evento</label>
              <input type="date" value={novoEvento.data_evento} onChange={e => setNovoEvento(p => ({ ...p, data_evento: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <input value={novoEvento.descricao} onChange={e => setNovoEvento(p => ({ ...p, descricao: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Descrição opcional..." />
          </div>
          <button onClick={salvarEvento}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Criar evento
          </button>
        </div>
      )}

      {/* Lista de eventos */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Carregando...</p>
      ) : eventos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum evento cadastrado ainda</p>
          <p className="text-gray-300 text-xs mt-1">Clique em "Novo evento" para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {eventos.map(ev => (
            <div key={ev.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Cabeçalho do evento */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-800">{ev.titulo}</p>
                  <p className="text-xs text-gray-400">
                    {ev.data_evento ? format(new Date(ev.data_evento + 'T00:00:00'), 'dd/MM/yyyy') : 'Sem data'}
                    {ev.descricao && ` · ${ev.descricao}`}
                    {` · ${ev.fotos_eventos?.length || 0} foto(s)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEventoAtivo(eventoAtivo === ev.id ? null : ev.id)}
                    className="text-orange-500 hover:bg-orange-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-orange-200"
                  >
                    {eventoAtivo === ev.id ? 'Fechar' : 'Ver fotos'}
                  </button>
                  <button
                    disabled={uploading}
                    className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-60"
                    onClick={() => { setEventoAtivo(ev.id); fileRef.current?.click() }}>
                    <Upload size={13} /> {uploading ? 'Enviando...' : 'Adicionar fotos'}
                  </button>
                  <button onClick={() => removerEvento(ev.id)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Fotos */}
              {eventoAtivo === ev.id && (
                <div className="p-4">
                  {ev.fotos_eventos?.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      Nenhuma foto ainda. Clique em "Adicionar fotos" para enviar.
                    </p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {ev.fotos_eventos?.map(foto => (
                        <div key={foto.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <img src={foto.url_foto} alt={foto.descricao} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removerFoto(foto.id, foto.url_foto)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files && eventoAtivo) {
            uploadFotos(eventoAtivo, e.target.files)
          }
          e.target.value = ''
        }
      />
    </div>
  )
}
