'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Code, Bold, Italic, Strikethrough, Plus, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Spec = any

type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'

type ButtonType =
  | 'QUICK_REPLY'
  | 'URL'
  | 'PHONE_NUMBER'
  | 'COPY_CODE'
  | 'OTP'
  | 'FLOW'
  | 'CATALOG'
  | 'MPM'
  | 'VOICE_CALL'

function ensureBaseSpec(input: unknown): Spec {
  const s = (input && typeof input === 'object') ? { ...(input as any) } : {}
  if (!s.name) s.name = 'novo_template'
  if (!s.language) s.language = 'pt_BR'
  if (!s.category) s.category = 'MARKETING'
  if (!s.parameter_format) s.parameter_format = 'positional'

  // body/content
  if (!s.body && typeof s.content === 'string') s.body = { text: s.content }
  if (!s.body) s.body = { text: '' }

  if (s.header === undefined) s.header = null
  if (s.footer === undefined) s.footer = null
  if (s.buttons === undefined) s.buttons = []
  if (s.carousel === undefined) s.carousel = null
  if (s.limited_time_offer === undefined) s.limited_time_offer = null

  return s
}

function variableCount(text: string): number {
  const matches = text.match(/\{\{[^}]+\}\}/g) || []
  const unique = new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))
  return unique.size
}

function nextPositionalVariable(text: string): number {
  // Encontra o maior {{n}} no texto e retorna n+1.
  // Se não houver, começa em 1.
  const matches = text.match(/\{\{\s*(\d+)\s*\}\}/g) || []
  let max = 0
  for (const m of matches) {
    const num = Number(m.replace(/\D+/g, ''))
    if (!Number.isNaN(num)) max = Math.max(max, num)
  }
  return max + 1
}

function wrapSelection(value: string, start: number, end: number, left: string, right = left) {
  const before = value.slice(0, start)
  const mid = value.slice(start, end)
  const after = value.slice(end)
  return {
    value: `${before}${left}${mid}${right}${after}`,
    nextStart: start + left.length,
    nextEnd: end + left.length,
  }
}

function insertAt(value: string, pos: number, insert: string) {
  return {
    value: `${value.slice(0, pos)}${insert}${value.slice(pos)}`,
    nextPos: pos + insert.length,
  }
}

function defaultBodyExamples(text: string): string[][] | undefined {
  const n = variableCount(text)
  if (n <= 0) return undefined
  const row = Array.from({ length: n }, (_, i) => `Exemplo ${i + 1}`)
  return [row]
}

function Preview({ spec }: { spec: Spec }) {
  const header = spec.header
  const bodyText = spec.body?.text || ''
  const footerText = spec.footer?.text || ''
  const buttons: any[] = Array.isArray(spec.buttons) ? spec.buttons : []

  const headerLabel = (() => {
    if (!header) return null
    if (header.format === 'TEXT') return header.text || ''
    if (header.format === 'LOCATION') return 'LOCALIZAÇÃO'
    return `MÍDIA (${header.format})`
  })()

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="text-sm font-semibold text-white mb-3">Prévia do modelo</div>
      <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-3">
        {headerLabel ? (
          <div className="text-sm text-gray-200 font-medium">
            {headerLabel}
          </div>
        ) : null}

        <div className="text-sm text-white whitespace-pre-wrap">
          {bodyText || <span className="text-gray-500">(Sem texto no BODY)</span>}
        </div>

        {footerText ? (
          <div className="text-xs text-gray-400 whitespace-pre-wrap">{footerText}</div>
        ) : null}

        {buttons.length > 0 ? (
          <div className="pt-2 border-t border-white/10 space-y-2">
            {buttons.map((b, idx) => (
              <div key={idx} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">
                {b.text || (b.type === 'COPY_CODE' ? 'Copiar código' : b.type)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ManualTemplateBuilder({
  id,
  initialSpec,
  onSpecChange,
}: {
  id: string
  initialSpec: unknown
  onSpecChange: (spec: unknown) => void
}) {
  const [spec, setSpec] = React.useState<Spec>(() => ensureBaseSpec(initialSpec))
  const [showDebug, setShowDebug] = React.useState(false)

  const headerTextRef = React.useRef<HTMLInputElement | null>(null)
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null)
  const footerRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setSpec(ensureBaseSpec(initialSpec))
  }, [initialSpec])

  const update = (patch: Partial<Spec>) => {
    setSpec((prev: any) => {
      const next = { ...prev, ...patch }
      onSpecChange(next)
      return next
    })
  }

  const updateHeader = (patch: any) => {
    setSpec((prev: any) => {
      const next = { ...prev, header: patch }
      onSpecChange(next)
      return next
    })
  }

  const updateFooter = (patch: any) => {
    setSpec((prev: any) => {
      const next = { ...prev, footer: patch }
      onSpecChange(next)
      return next
    })
  }

  const updateButtons = (buttons: any[]) => {
    setSpec((prev: any) => {
      const next = { ...prev, buttons }
      onSpecChange(next)
      return next
    })
  }

  const header: any = spec.header
  const buttons: any[] = Array.isArray(spec.buttons) ? spec.buttons : []

  const variableMode: 'positional' | 'named' = spec.parameter_format || 'positional'

  const addVariable = (target: 'header' | 'body' | 'footer') => {
    const currentText =
      target === 'header'
        ? String(header?.text || '')
        : target === 'footer'
          ? String(spec.footer?.text || '')
          : String(spec.body?.text || '')

    const placeholder = (() => {
      if (variableMode === 'positional') {
        const next = nextPositionalVariable(currentText)
        return `{{${next}}}`
      }

      const name = window.prompt('Nome da variável (ex: first_name)')
      if (!name) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      return `{{${trimmed}}}`
    })()

    if (!placeholder) return

    if (target === 'header') {
      const el = headerTextRef.current
      const start = el?.selectionStart ?? currentText.length
      const { value, nextPos } = insertAt(currentText, start, placeholder)
      updateHeader({ ...(header || { format: 'TEXT' }), format: 'TEXT', text: value, example: header?.example ?? null })
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })
      return
    }

    if (target === 'footer') {
      const el = footerRef.current
      const start = el?.selectionStart ?? currentText.length
      const { value, nextPos } = insertAt(currentText, start, placeholder)
      updateFooter({ ...(spec.footer || {}), text: value })
      requestAnimationFrame(() => {
        if (!el) return
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })
      return
    }

    // body
    const el = bodyRef.current
    const start = el?.selectionStart ?? currentText.length
    const { value, nextPos } = insertAt(currentText, start, placeholder)
    const example = defaultBodyExamples(value)
    update({ body: { ...(spec.body || {}), text: value, example: example ? { body_text: example } : undefined } })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(nextPos, nextPos)
    })
  }

  const applyBodyFormat = (kind: 'bold' | 'italic' | 'strike' | 'code') => {
    const el = bodyRef.current
    const value = String(spec.body?.text || '')
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const token = kind === 'bold' ? '*' : kind === 'italic' ? '_' : kind === 'strike' ? '~' : '`'
    const { value: nextValue, nextStart, nextEnd } = wrapSelection(value, start, end, token)
    const example = defaultBodyExamples(nextValue)
    update({ body: { ...(spec.body || {}), text: nextValue, example: example ? { body_text: example } : undefined } })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(nextStart, nextEnd)
    })
  }

  const headerEnabled = !!spec.header
  const headerType: HeaderFormat | 'NONE' = headerEnabled ? (header?.format || 'TEXT') : 'NONE'
  const bodyText: string = String(spec.body?.text || '')
  const footerText: string = String(spec.footer?.text || '')
  const headerText: string = String(header?.text || '')

  const headerTextCount = headerText.length
  const bodyTextCount = bodyText.length
  const footerTextCount = footerText.length

  const canShowMediaSample = headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),420px] gap-6">
      <div className="space-y-6">
        {/* CONFIG (equivalente ao passo anterior na Meta, mas mantemos aqui) */}
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Configuração do modelo</div>
              <div className="text-xs text-gray-500">ID: <span className="font-mono">{id}</span></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Nome</label>
              <Input
                value={spec.name || ''}
                onChange={(e) => update({ name: e.target.value })}
                className="bg-zinc-900 border-white/10 text-white"
              />
              <p className="text-xs text-gray-500">Apenas <span className="font-mono">a-z 0-9 _</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Categoria</label>
              <Select value={spec.category} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilidade</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Idioma</label>
              <Select value={spec.language} onValueChange={(v) => update({ language: v })}>
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">pt_BR</SelectItem>
                  <SelectItem value="en_US">en_US</SelectItem>
                  <SelectItem value="es_ES">es_ES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">parameter_format</label>
              <Select value={spec.parameter_format || 'positional'} onValueChange={(v) => update({ parameter_format: v })}>
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positional">Positional ({'{{1}}'})</SelectItem>
                  <SelectItem value="named">Named ({'{{first_name}}'})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* CONTEÚDO (como na Meta) */}
        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold text-white">Conteúdo</div>
            <div className="text-xs text-gray-400 mt-1">
              Adicione um cabeçalho, corpo de texto e rodapé para o seu modelo. A Meta analisa variáveis e conteúdo antes da aprovação.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Tipo de variável</label>
              <Select
                value={variableMode}
                onValueChange={(v) => update({ parameter_format: v })}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positional">Número</SelectItem>
                  <SelectItem value="named">Nome (avançado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Amostra de mídia <span className="text-gray-500">• Opcional</span></label>
              <Select
                value={canShowMediaSample ? 'handle' : 'none'}
                onValueChange={() => {
                  // A seleção real é determinada pelo tipo de Header.
                  // Mantemos o controle aqui para espelhar a UX da Meta.
                }}
                disabled={!canShowMediaSample}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white disabled:opacity-60">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="handle">Usar header_handle</SelectItem>
                </SelectContent>
              </Select>
              {!canShowMediaSample ? (
                <div className="text-xs text-gray-500">Selecione um cabeçalho de mídia (Imagem/Vídeo/Documento) para ativar.</div>
              ) : null}
            </div>
          </div>

          {/* CABEÇALHO */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Cabeçalho <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Tipo</label>
                <Select
                  value={headerType}
                  onValueChange={(v) => {
                    const format = v as HeaderFormat | 'NONE'
                    if (format === 'NONE') {
                      update({ header: null })
                      return
                    }
                    if (format === 'TEXT') updateHeader({ format: 'TEXT', text: '', example: null })
                    else if (format === 'LOCATION') updateHeader({ format: 'LOCATION' })
                    else updateHeader({ format, example: { header_handle: [''] } })
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhum</SelectItem>
                    <SelectItem value="TEXT">Texto</SelectItem>
                    <SelectItem value="IMAGE">Imagem</SelectItem>
                    <SelectItem value="VIDEO">Vídeo</SelectItem>
                    <SelectItem value="DOCUMENT">Documento</SelectItem>
                    <SelectItem value="LOCATION">Localização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {headerType === 'TEXT' ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-300">Cabeçalho</label>
                  <div className="text-xs text-gray-500">{headerTextCount}/60</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    ref={headerTextRef as any}
                    value={headerText}
                    onChange={(e) => updateHeader({ ...header, format: 'TEXT', text: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white"
                    placeholder="Adicione uma pequena linha de texto (opcional)"
                    maxLength={60}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addVariable('header')}
                    className="border-white/10 bg-zinc-900 hover:bg-white/5"
                  >
                    <Plus className="w-4 h-4" />
                    Variável
                  </Button>
                </div>
              </div>
            ) : null}

            {canShowMediaSample ? (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-gray-300">header_handle (mídia)</label>
                <Input
                  value={header?.example?.header_handle?.[0] || ''}
                  onChange={(e) => updateHeader({ ...header, example: { ...(header.example || {}), header_handle: [e.target.value] } })}
                  className="bg-zinc-900 border-white/10 text-white"
                  placeholder="Cole o header_handle (upload resumable: em breve)"
                />
                <p className="text-xs text-gray-500">
                  Por enquanto, cole o <span className="font-mono">header_handle</span>. Depois a gente automatiza o upload.
                </p>
              </div>
            ) : null}
          </div>

          {/* CORPO */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Corpo</div>
              <div className="text-xs text-gray-500">{bodyTextCount}/1024</div>
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950">
              <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10">
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('bold')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('italic')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('strike')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Strikethrough className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => applyBodyFormat('code')} className="h-8 px-2 text-gray-200 hover:bg-white/5">
                  <Code className="w-4 h-4" />
                </Button>

                <div className="flex-1" />

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => addVariable('body')}
                  className="h-8 px-2 text-gray-200 hover:bg-white/5"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar variável
                </Button>
              </div>

              <div className="p-2">
                <Textarea
                  ref={bodyRef as any}
                  value={bodyText}
                  onChange={(e) => {
                    const text = e.target.value
                    const example = defaultBodyExamples(text)
                    update({ body: { ...(spec.body || {}), text, example: example ? { body_text: example } : undefined } })
                  }}
                  className="bg-transparent border-none text-white min-h-32 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Digite o texto do corpo (obrigatório)"
                  maxLength={1024}
                />
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Variáveis detectadas: <span className="font-mono">{variableCount(bodyText)}</span>
              {!bodyText.trim() ? <span className="text-amber-300"> • O corpo é obrigatório.</span> : null}
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Rodapé <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
              <div className="text-xs text-gray-500">{footerTextCount}/60</div>
            </div>

            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-zinc-900 hover:bg-white/5"
                  onClick={() => updateFooter(spec.footer ? null : { text: '' })}
                >
                  {spec.footer ? 'Remover rodapé' : 'Adicionar rodapé'}
                </Button>
              </div>

              {spec.footer ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={footerRef as any}
                    value={footerText}
                    onChange={(e) => updateFooter({ ...(spec.footer || {}), text: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white"
                    placeholder="Inserir texto"
                    maxLength={60}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addVariable('footer')}
                    className="border-white/10 bg-zinc-900 hover:bg-white/5"
                  >
                    <Plus className="w-4 h-4" />
                    Variável
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Header</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Formato</label>
              <Select
                value={header?.format || 'TEXT'}
                onValueChange={(v) => {
                  const format = v as HeaderFormat
                  if (format === 'TEXT') updateHeader({ format: 'TEXT', text: '', example: null })
                  else if (format === 'LOCATION') updateHeader({ format: 'LOCATION' })
                  else updateHeader({ format, example: { header_handle: [''] } })
                }}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEXT">TEXT</SelectItem>
                  <SelectItem value="IMAGE">IMAGE</SelectItem>
                  <SelectItem value="VIDEO">VIDEO</SelectItem>
                  <SelectItem value="DOCUMENT">DOCUMENT</SelectItem>
                  <SelectItem value="LOCATION">LOCATION</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Ativar</label>
              <Select
                value={spec.header ? 'yes' : 'no'}
                onValueChange={(v) => {
                  if (v === 'no') update({ header: null })
                  else updateHeader({ format: 'TEXT', text: '', example: null })
                }}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {spec.header && header?.format === 'TEXT' ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Texto</label>
              <Input
                value={header.text || ''}
                onChange={(e) => updateHeader({ ...header, text: e.target.value })}
                className="bg-zinc-900 border-white/10 text-white"
                placeholder="Ex.: Confirmação"
              />
            </div>
          ) : null}

          {spec.header && header && header.format && header.format !== 'TEXT' && header.format !== 'LOCATION' ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">header_handle (mídia)</label>
              <Input
                value={header?.example?.header_handle?.[0] || ''}
                onChange={(e) => updateHeader({ ...header, example: { ...(header.example || {}), header_handle: [e.target.value] } })}
                className="bg-zinc-900 border-white/10 text-white"
                placeholder="Cole o handle da mídia aqui (upload resumable será automatizado)"
              />
              <p className="text-xs text-gray-500">
                Por enquanto, você pode colar o <span className="font-mono">header_handle</span>. Vou automatizar o upload em seguida.
              </p>
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Body</div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">Texto</label>
            <Textarea
              value={spec.body?.text || ''}
              onChange={(e) => {
                const text = e.target.value
                const example = defaultBodyExamples(text)
                update({ body: { ...(spec.body || {}), text, example: example ? { body_text: example } : undefined } })
              }}
              className="bg-zinc-900 border-white/10 text-white min-h-32"
              placeholder="Digite o texto do BODY (obrigatório)"
            />
            <div className="text-xs text-gray-500">
              Variáveis detectadas: <span className="font-mono">{variableCount(spec.body?.text || '')}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-white">Footer</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-zinc-900 hover:bg-white/5"
              onClick={() => updateFooter(spec.footer ? null : { text: '' })}
            >
              {spec.footer ? 'Remover footer' : 'Adicionar footer'}
            </Button>
          </div>
          {spec.footer ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">Texto</label>
              <Input
                value={spec.footer?.text || ''}
                onChange={(e) => updateFooter({ ...(spec.footer || {}), text: e.target.value })}
                className="bg-zinc-900 border-white/10 text-white"
              />
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-white">Botões <span className="text-xs text-gray-500 font-normal">• Opcional</span></div>
              <div className="text-xs text-gray-400">É possível adicionar até 10 botões. Se adicionar mais de 3, eles aparecem em lista.</div>
            </div>
            <Button
              variant="outline"
              className="border-white/10 bg-zinc-900 hover:bg-white/5"
              onClick={() => updateButtons([...buttons, { type: 'QUICK_REPLY', text: '' }])}
            >
              <Plus className="w-4 h-4" />
              Adicionar botão
              <ChevronDown className="w-4 h-4 opacity-70" />
            </Button>
          </div>

          {buttons.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum botão</div>
          ) : (
            <div className="space-y-3">
              {buttons.map((b, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-gray-200">Botão {idx + 1}</div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                    >
                      Remover
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">Tipo</label>
                      <Select
                        value={b.type}
                        onValueChange={(v) => {
                          const t = v as ButtonType
                          const next = [...buttons]
                          next[idx] = { type: t }
                          if (t === 'QUICK_REPLY' || t === 'URL' || t === 'PHONE_NUMBER' || t === 'FLOW' || t === 'CATALOG' || t === 'MPM' || t === 'VOICE_CALL') {
                            next[idx].text = ''
                          }
                          if (t === 'URL') next[idx].url = 'https://'
                          if (t === 'PHONE_NUMBER') next[idx].phone_number = ''
                          if (t === 'COPY_CODE') next[idx].example = 'CODE123'
                          if (t === 'OTP') next[idx].otp_type = 'COPY_CODE'
                          if (t === 'FLOW') next[idx].flow_id = ''
                          updateButtons(next)
                        }}
                      >
                        <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICK_REPLY">QUICK_REPLY</SelectItem>
                          <SelectItem value="URL">URL</SelectItem>
                          <SelectItem value="PHONE_NUMBER">PHONE_NUMBER</SelectItem>
                          <SelectItem value="COPY_CODE">COPY_CODE</SelectItem>
                          <SelectItem value="OTP">OTP</SelectItem>
                          <SelectItem value="FLOW">FLOW</SelectItem>
                          <SelectItem value="CATALOG">CATALOG</SelectItem>
                          <SelectItem value="MPM">MPM</SelectItem>
                          <SelectItem value="VOICE_CALL">VOICE_CALL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {b.type !== 'COPY_CODE' && b.type !== 'OTP' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">Texto</label>
                        <Input
                          value={b.text || ''}
                          onChange={(e) => {
                            const next = [...buttons]
                            next[idx] = { ...b, text: e.target.value }
                            updateButtons(next)
                          }}
                          className="bg-zinc-900 border-white/10 text-white"
                        />
                      </div>
                    ) : null}
                  </div>

                  {b.type === 'URL' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">URL</label>
                        <Input
                          value={b.url || ''}
                          onChange={(e) => {
                            const next = [...buttons]
                            next[idx] = { ...b, url: e.target.value }
                            updateButtons(next)
                          }}
                          className="bg-zinc-900 border-white/10 text-white"
                          placeholder="https://site.com/{{1}}"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">Exemplo (para URL dinâmica)</label>
                        <Input
                          value={(Array.isArray(b.example) ? b.example[0] : b.example) || ''}
                          onChange={(e) => {
                            const next = [...buttons]
                            next[idx] = { ...b, example: [e.target.value] }
                            updateButtons(next)
                          }}
                          className="bg-zinc-900 border-white/10 text-white"
                          placeholder="ex: 123"
                        />
                      </div>
                    </div>
                  ) : null}

                  {b.type === 'PHONE_NUMBER' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">Telefone</label>
                      <Input
                        value={b.phone_number || ''}
                        onChange={(e) => {
                          const next = [...buttons]
                          next[idx] = { ...b, phone_number: e.target.value }
                          updateButtons(next)
                        }}
                        className="bg-zinc-900 border-white/10 text-white"
                        placeholder="5511999999999"
                      />
                    </div>
                  ) : null}

                  {b.type === 'COPY_CODE' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">Exemplo</label>
                      <Input
                        value={(Array.isArray(b.example) ? b.example[0] : b.example) || ''}
                        onChange={(e) => {
                          const next = [...buttons]
                          next[idx] = { ...b, example: e.target.value }
                          updateButtons(next)
                        }}
                        className="bg-zinc-900 border-white/10 text-white"
                        placeholder="CUPOM10"
                      />
                    </div>
                  ) : null}

                  {b.type === 'OTP' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">otp_type</label>
                        <Select
                          value={b.otp_type || 'COPY_CODE'}
                          onValueChange={(v) => {
                            const next = [...buttons]
                            next[idx] = { ...b, otp_type: v }
                            updateButtons(next)
                          }}
                        >
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COPY_CODE">COPY_CODE</SelectItem>
                            <SelectItem value="ONE_TAP">ONE_TAP</SelectItem>
                            <SelectItem value="ZERO_TAP">ZERO_TAP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">Texto (opcional)</label>
                        <Input
                          value={b.text || ''}
                          onChange={(e) => {
                            const next = [...buttons]
                            next[idx] = { ...b, text: e.target.value }
                            updateButtons(next)
                          }}
                          className="bg-zinc-900 border-white/10 text-white"
                          placeholder="Copiar código"
                        />
                      </div>
                    </div>
                  ) : null}

                  {b.type === 'FLOW' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">flow_id</label>
                        <Input
                          value={b.flow_id || ''}
                          onChange={(e) => {
                            const next = [...buttons]
                            next[idx] = { ...b, flow_id: e.target.value }
                            updateButtons(next)
                          }}
                          className="bg-zinc-900 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-300">flow_action (opcional)</label>
                        <Select
                          value={b.flow_action || 'navigate'}
                          onValueChange={(v) => {
                            const next = [...buttons]
                            next[idx] = { ...b, flow_action: v }
                            updateButtons(next)
                          }}
                        >
                          <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="navigate">navigate</SelectItem>
                            <SelectItem value="data_exchange">data_exchange</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  <div className="text-xs text-gray-500">
                    Regras: URL máx 2, PHONE_NUMBER máx 1, COPY_CODE máx 1; QUICK_REPLY devem ficar juntos.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn('glass-panel rounded-xl p-5 space-y-4', spec.category !== 'MARKETING' ? 'opacity-70' : '')}>
          <div className="text-sm font-semibold text-white">Limited Time Offer (Marketing)</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-zinc-900 hover:bg-white/5"
              onClick={() => update({ limited_time_offer: spec.limited_time_offer ? null : { text: '', has_expiration: true } })}
              disabled={spec.category !== 'MARKETING'}
            >
              {spec.limited_time_offer ? 'Remover' : 'Adicionar'}
            </Button>
          </div>
          {spec.limited_time_offer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Texto (máx 16)</label>
                <Input
                  value={spec.limited_time_offer.text || ''}
                  onChange={(e) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), text: e.target.value } })}
                  className="bg-zinc-900 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">has_expiration</label>
                <Select
                  value={String(!!spec.limited_time_offer.has_expiration)}
                  onValueChange={(v) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), has_expiration: v === 'true' } })}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn('glass-panel rounded-xl p-5 space-y-4', spec.category !== 'AUTHENTICATION' ? 'opacity-70' : '')}>
          <div className="text-sm font-semibold text-white">Autenticação (Auth)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">message_send_ttl_seconds</label>
              <Input
                value={spec.message_send_ttl_seconds ?? ''}
                onChange={(e) => update({ message_send_ttl_seconds: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-zinc-900 border-white/10 text-white"
                placeholder="ex: 300"
                disabled={spec.category !== 'AUTHENTICATION'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">add_security_recommendation</label>
              <Select
                value={String(!!spec.add_security_recommendation)}
                onValueChange={(v) => update({ add_security_recommendation: v === 'true' })}
                disabled={spec.category !== 'AUTHENTICATION'}
              >
                <SelectTrigger className="w-full bg-zinc-900 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-300">code_expiration_minutes</label>
              <Input
                value={spec.code_expiration_minutes ?? ''}
                onChange={(e) => update({ code_expiration_minutes: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-zinc-900 border-white/10 text-white"
                placeholder="ex: 10"
                disabled={spec.category !== 'AUTHENTICATION'}
              />
            </div>
          </div>
        </div>

        {/* CAROUSEL (suporte inicial via JSON) */}
        <div className="glass-panel rounded-xl p-5 space-y-3">
          <div className="text-sm font-semibold text-white">Carousel</div>
          <div className="text-xs text-gray-500">
            Suporte completo ao Carousel exige editor de cards (2-10) + mídia (header_handle). Por enquanto, habilitei como edição avançada.
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300">JSON (carousel)</label>
            <Textarea
              value={spec.carousel ? JSON.stringify(spec.carousel, null, 2) : ''}
              onChange={(e) => {
                try {
                  const val = e.target.value.trim()
                  update({ carousel: val ? JSON.parse(val) : null })
                } catch {
                  // não travar digitando
                }
              }}
              className="bg-zinc-900 border-white/10 text-white min-h-28 font-mono text-xs"
              placeholder="Cole aqui um JSON de carousel (opcional)"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Preview spec={spec} />

        <div className="glass-panel rounded-xl p-4">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="text-sm font-semibold text-white">Debug</div>
            <div className="text-xs text-gray-400">{showDebug ? 'Ocultar' : 'Ver JSON'}</div>
          </button>
          {showDebug ? (
            <pre className="mt-3 text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(spec, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}
