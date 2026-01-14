'use client'

import React from 'react'
import Image from 'next/image'
import { Play, ExternalLink, CornerDownLeft, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const panelClass = 'rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)]'

type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'GIF' | 'DOCUMENT' | 'LOCATION'

type HeaderMediaPreview = {
  url: string
  format: HeaderFormat
  name: string
  mimeType: string
  size: number
}

type Spec = {
  header?: {
    format?: HeaderFormat
    text?: string
  } | null
  body?: {
    text?: string
  }
  footer?: {
    text?: string
  } | null
  buttons?: any[]
}

interface TemplatePreviewProps {
  spec: Spec
  headerMediaPreview?: HeaderMediaPreview | null
}

export function TemplatePreview({ spec, headerMediaPreview }: TemplatePreviewProps) {
  const header = spec.header
  const bodyText = spec.body?.text || ''
  const footerText = spec.footer?.text || ''
  const buttons: any[] = Array.isArray(spec.buttons) ? spec.buttons : []

  const prettyButtonLabel = (b: any): string => {
    const t = String(b?.type || '')
    if (t === 'COPY_CODE') return b?.text || 'Copiar codigo'
    if (t === 'QUICK_REPLY') return b?.text || 'Quick Reply'
    return b?.text || t
  }

  const headerLabel = (() => {
    if (!header) return null
    if (header.format === 'TEXT') return header.text || ''
    if (header.format === 'LOCATION') return 'LOCALIZACAO'
    return `MIDIA (${header.format})`
  })()

  const resolvedHeaderMediaPreview = (() => {
    if (!header) return null
    const format = String(header?.format || '').toUpperCase()
    if (format !== 'IMAGE' && format !== 'VIDEO' && format !== 'GIF' && format !== 'DOCUMENT') return null
    if (!headerMediaPreview) return null
    if (headerMediaPreview.format !== format) return null
    return headerMediaPreview
  })()

  return (
    <div className={`${panelClass} overflow-hidden`}>
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="text-sm font-semibold text-white">Previa do modelo</div>
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-white/10 bg-zinc-950/40 hover:bg-white/5 text-gray-200"
          title="Visualizar"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6">
        {/* "telefone" */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#efeae2]">
            {/* header da conversa */}
            <div className="h-11 px-3 flex items-center gap-2 bg-[#075e54] text-white">
              <div className="h-7 w-7 rounded-full bg-white/20" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-none truncate">Business</div>
                <div className="text-[10px] text-white/80 leading-none mt-0.5 truncate">template</div>
              </div>
            </div>

            {/* conversa */}
            <div className="p-3">
              <div className="max-w-90 rounded-xl bg-white text-zinc-900 shadow-sm overflow-hidden">
                <div className="px-3 py-2">
                {resolvedHeaderMediaPreview ? (
                  <div className="mb-2">
                    {resolvedHeaderMediaPreview.format === 'IMAGE' ? (
                      <Image
                        src={resolvedHeaderMediaPreview.url}
                        alt={resolvedHeaderMediaPreview.name || 'Midia do cabecalho'}
                        width={360}
                        height={180}
                        unoptimized
                        className="w-full h-auto rounded-lg border border-zinc-200"
                      />
                    ) : resolvedHeaderMediaPreview.format === 'VIDEO' || resolvedHeaderMediaPreview.format === 'GIF' ? (
                      <video
                        src={resolvedHeaderMediaPreview.url}
                        controls
                        muted
                        playsInline
                        className="w-full rounded-lg border border-zinc-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <FileText className="w-4 h-4 text-zinc-600" />
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate">
                            {resolvedHeaderMediaPreview.name || 'documento.pdf'}
                          </div>
                          <div className="text-[10px] text-zinc-500">Documento</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : headerLabel ? (
                  <div className="text-[13px] font-semibold leading-snug">
                    {headerLabel}
                  </div>
                ) : null}

                <div className="text-[13px] leading-snug whitespace-pre-wrap">
                  {bodyText || <span className="text-zinc-400">Digite o corpo para ver a previa.</span>}
                </div>

                {footerText ? (
                  <div className="mt-1 text-[11px] text-zinc-500 whitespace-pre-wrap">
                    {footerText}
                  </div>
                ) : null}

                <div className="mt-1 flex items-center justify-end text-[10px] text-zinc-400">
                  16:34
                </div>
                </div>

                {buttons.length > 0 ? (
                  <div className="border-t border-zinc-200">
                    {buttons.map((b, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'px-3 py-3 text-center text-[13px] font-medium text-blue-600 flex items-center justify-center gap-2',
                          idx > 0 ? 'border-t border-zinc-200' : ''
                        )}
                      >
                        {String(b?.type || '') === 'URL' ? (
                          <ExternalLink className="w-4 h-4" />
                        ) : String(b?.type || '') === 'QUICK_REPLY' ? (
                          <CornerDownLeft className="w-4 h-4" />
                        ) : null}
                        <span>{prettyButtonLabel(b)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
