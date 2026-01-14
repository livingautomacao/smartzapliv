'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  ChevronDown,
  GripVertical,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Spec = any

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
  | 'EXTENSION'
  | 'ORDER_DETAILS'
  | 'POSTBACK'
  | 'REMINDER'
  | 'SEND_LOCATION'
  | 'SPM'

type Flow = {
  id: string
  name: string
  meta_flow_id?: string | null
  meta_status?: string | null
}

export interface StepButtonsProps {
  spec: Spec
  buttons: any[]
  updateButtons: (buttons: any[]) => void
  addButton: (type: ButtonType) => void
  canAddButtonType: (type: ButtonType) => { ok: boolean; reason?: string }
  publishedFlows: Flow[]
  flowsQueryIsLoading: boolean
  isMarketingCategory: boolean
  isLimitedTimeOffer: boolean
  allowedButtonTypes: Set<ButtonType>
  counts: {
    total: number
    url: number
    phone: number
    copyCode: number
    otp: number
  }
  maxButtonText: number
  maxButtons: number
  buttonErrors: string[]
  carouselErrors: string[]
  limitedTimeOfferTextMissing: boolean
  limitedTimeOfferTextTooLong: boolean
  limitedTimeOfferCategoryInvalid: boolean
  // LTO panel
  header: any
  update: (patch: Partial<Spec>) => void
  // Utilities
  clampText: (value: string, max: number) => string
  countChars: (value: unknown) => number
  splitPhone: (phone: string) => { country: string; number: string }
  joinPhone: (country: string, number: string) => string
}

const requiresButtonText = new Set<ButtonType>([
  'QUICK_REPLY',
  'URL',
  'PHONE_NUMBER',
  'COPY_CODE',
  'FLOW',
  'VOICE_CALL',
  'CATALOG',
  'MPM',
  'EXTENSION',
  'ORDER_DETAILS',
  'POSTBACK',
  'REMINDER',
  'SEND_LOCATION',
  'SPM',
  'OTP',
])

const panelClass = 'rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)]'
const panelPadding = 'p-6'
const panelCompactPadding = 'p-4'

export function StepButtons({
  spec,
  buttons,
  updateButtons,
  addButton,
  canAddButtonType,
  publishedFlows,
  flowsQueryIsLoading,
  isMarketingCategory,
  isLimitedTimeOffer,
  allowedButtonTypes,
  counts,
  maxButtonText,
  maxButtons,
  buttonErrors,
  carouselErrors,
  limitedTimeOfferTextMissing,
  limitedTimeOfferTextTooLong,
  limitedTimeOfferCategoryInvalid,
  header,
  update,
  clampText,
  countChars,
  splitPhone,
  joinPhone,
}: StepButtonsProps) {
  return (
    <>
      <div className={`${panelClass} ${panelPadding} space-y-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Botoes <span className="text-xs text-gray-500 font-normal">* Opcional</span></div>
            <div className="text-xs text-gray-400">E possivel adicionar ate 10 botoes. Se adicionar mais de 3, eles aparecem em lista.</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-white/10 bg-zinc-950/40 hover:bg-white/5"
              >
                <Plus className="w-4 h-4" />
                Adicionar botao
                <ChevronDown className="w-4 h-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-60">
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">
                Acoes
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => addButton('QUICK_REPLY')}
                disabled={!canAddButtonType('QUICK_REPLY').ok}
                className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
              >
                Resposta rapida
                <DropdownMenuShortcut>ate 10</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addButton('URL')}
                disabled={!canAddButtonType('URL').ok}
                className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
              >
                Visitar site
                <DropdownMenuShortcut>max 2</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addButton('PHONE_NUMBER')}
                disabled={!canAddButtonType('PHONE_NUMBER').ok}
                className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
              >
                Ligar
                <DropdownMenuShortcut>max 1</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => addButton('COPY_CODE')}
                disabled={!canAddButtonType('COPY_CODE').ok}
                className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
              >
                Copiar codigo
                <DropdownMenuShortcut>max 1</DropdownMenuShortcut>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                  Avancado
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-zinc-900 border-white/10 text-white min-w-56">
                  <DropdownMenuItem
                    onClick={() => addButton('FLOW')}
                    disabled={!canAddButtonType('FLOW').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    MiniApp
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('OTP')}
                    disabled={!canAddButtonType('OTP').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    OTP
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('CATALOG')}
                    disabled={!canAddButtonType('CATALOG').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Catalogo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('MPM')}
                    disabled={!canAddButtonType('MPM').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    MPM
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('VOICE_CALL')}
                    disabled={!canAddButtonType('VOICE_CALL').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Chamada de voz
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('ORDER_DETAILS')}
                    disabled={!canAddButtonType('ORDER_DETAILS').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Detalhes do pedido
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('SPM')}
                    disabled={!canAddButtonType('SPM').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    SPM
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('SEND_LOCATION')}
                    disabled={!canAddButtonType('SEND_LOCATION').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Enviar localizacao
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('REMINDER')}
                    disabled={!canAddButtonType('REMINDER').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Lembrete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('POSTBACK')}
                    disabled={!canAddButtonType('POSTBACK').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Postback
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => addButton('EXTENSION')}
                    disabled={!canAddButtonType('EXTENSION').ok}
                    className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                  >
                    Extensao
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {buttons.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhum botao</div>
        ) : (
          <div className="space-y-5">
            {/* Resposta rapida */}
            {(() => {
              const rows = buttons
                .map((b, idx) => ({ b, idx }))
                .filter(({ b }) => b?.type === 'QUICK_REPLY')

              if (rows.length === 0) return null

              return (
                <div className="space-y-3">
                  <div className="text-xs text-gray-400">Resposta rapida <span className="text-gray-500">* Opcional</span></div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-[18px_minmax(0,1fr)_40px] gap-3 items-center">
                      <div />
                      <div className="text-xs font-medium text-gray-300">Texto do botao</div>
                      <div />
                    </div>

                    <div className="space-y-3">
                      {rows.map(({ b, idx }) => {
                        const text = String(b?.text || '')
                        const hasTextError = requiresButtonText.has(b?.type) && !text.trim()
                        return (
                          <div key={idx} className="grid grid-cols-[18px_minmax(0,1fr)_40px] gap-3 items-center">
                            <GripVertical className="w-4 h-4 text-gray-500" />

                            <div className="relative">
                              <Input
                                value={text}
                                onChange={(e) => {
                                  const next = [...buttons]
                                  next[idx] = { ...b, text: clampText(e.target.value, maxButtonText) }
                                  updateButtons(next)
                                }}
                                className="h-11 bg-zinc-950/40 border-white/10 text-white pr-16"
                                maxLength={maxButtonText}
                                placeholder="Quick Reply"
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                {countChars(text)}/{maxButtonText}
                              </div>
                              {hasTextError && (
                                <div className="mt-1 text-xs text-amber-300">Informe o texto do botao.</div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/5"
                              title="Remover"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Chamada para acao */}
            {(() => {
              const rows = buttons
                .map((b, idx) => ({ b, idx }))
                .filter(({ b }) => b?.type !== 'QUICK_REPLY')

              if (rows.length === 0) return null

              return (
                <div className="space-y-3">
                  <div className="text-xs text-gray-400">Chamada para acao <span className="text-gray-500">* Opcional</span></div>

                  <div className="space-y-4">
                    {rows.map(({ b, idx }, rowIndex) => {
                      const type = b?.type as ButtonType
                      const buttonText = String(b?.text || '')
                      const hasTextError = requiresButtonText.has(type) && !buttonText.trim()
                      const rowClassName = rowIndex === 0
                        ? 'relative pb-4 pr-12'
                        : 'relative border-t border-white/10 pt-4 pb-4 pr-12'

                      const headerRow = (
                        <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-4">
                          <div className="pt-6">
                            <GripVertical className="w-4 h-4 text-gray-500" />
                          </div>

                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Tipo de acao</div>
                                <Select
                                  value={type}
                                  onValueChange={(v) => {
                                    const t = v as ButtonType
                                    if (!allowedButtonTypes.has(t)) return
                                    const next = [...buttons]
                                    next[idx] = { type: t }
                                    if (
                                      t === 'QUICK_REPLY' ||
                                      t === 'URL' ||
                                      t === 'PHONE_NUMBER' ||
                                      t === 'FLOW' ||
                                      t === 'CATALOG' ||
                                      t === 'MPM' ||
                                      t === 'VOICE_CALL' ||
                                      t === 'EXTENSION' ||
                                      t === 'ORDER_DETAILS' ||
                                      t === 'POSTBACK' ||
                                      t === 'REMINDER' ||
                                      t === 'SEND_LOCATION' ||
                                      t === 'SPM'
                                    ) {
                                      next[idx].text = ''
                                    }
                                    if (t === 'URL') next[idx].url = 'https://'
                                    if (t === 'PHONE_NUMBER') next[idx].phone_number = ''
                                    if (t === 'COPY_CODE') {
                                      next[idx].text = 'Copiar codigo'
                                      next[idx].example = 'CODE123'
                                    }
                                    if (t === 'OTP') {
                                      next[idx].text = 'Copiar codigo'
                                      next[idx].otp_type = 'COPY_CODE'
                                    }
                                    if (t === 'FLOW') next[idx].flow_id = ''
                                    updateButtons(next)
                                  }}
                                >
                                  <SelectTrigger className="h-11 w-full bg-zinc-950/40 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="URL" disabled={!allowedButtonTypes.has('URL')}>Acessar o site</SelectItem>
                                    <SelectItem value="PHONE_NUMBER" disabled={!allowedButtonTypes.has('PHONE_NUMBER')}>Ligar</SelectItem>
                                    <SelectItem value="COPY_CODE" disabled={!allowedButtonTypes.has('COPY_CODE')}>Copiar codigo da oferta</SelectItem>
                                    <SelectItem value="FLOW" disabled={!allowedButtonTypes.has('FLOW')}>Concluir MiniApp</SelectItem>
                                    <SelectItem value="VOICE_CALL" disabled={!allowedButtonTypes.has('VOICE_CALL')}>Ligar no WhatsApp</SelectItem>
                                    <SelectItem value="CATALOG" disabled={!allowedButtonTypes.has('CATALOG')}>Catalogo</SelectItem>
                                    <SelectItem value="MPM" disabled={!allowedButtonTypes.has('MPM')}>MPM</SelectItem>
                                    <SelectItem value="ORDER_DETAILS" disabled={!allowedButtonTypes.has('ORDER_DETAILS')}>Detalhes do pedido</SelectItem>
                                    <SelectItem value="SPM" disabled={!allowedButtonTypes.has('SPM')}>SPM</SelectItem>
                                    <SelectItem value="SEND_LOCATION" disabled={!allowedButtonTypes.has('SEND_LOCATION')}>Enviar localizacao</SelectItem>
                                    <SelectItem value="REMINDER" disabled={!allowedButtonTypes.has('REMINDER')}>Lembrete</SelectItem>
                                    <SelectItem value="POSTBACK" disabled={!allowedButtonTypes.has('POSTBACK')}>Postback</SelectItem>
                                    <SelectItem value="EXTENSION" disabled={!allowedButtonTypes.has('EXTENSION')}>Extensao</SelectItem>
                                    <SelectItem value="OTP" disabled={!allowedButtonTypes.has('OTP')}>OTP</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Texto do botao</div>
                                <div className="relative">
                                  <Input
                                    value={buttonText}
                                    onChange={(e) => {
                                      const next = [...buttons]
                                      next[idx] = { ...b, text: clampText(e.target.value, maxButtonText) }
                                      updateButtons(next)
                                    }}
                                    className="h-11 bg-zinc-950/40 border-white/10 text-white pr-16"
                                    maxLength={maxButtonText}
                                    placeholder={type === 'URL' ? 'Visualizar' : 'Texto'}
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                    {countChars(buttonText)}/{maxButtonText}
                                  </div>
                                  {hasTextError && (
                                    <div className="mt-1 text-xs text-amber-300">Informe o texto do botao.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )

                      const bodyRow = (() => {
                        if (type === 'URL') {
                          const url = String(b?.url || '')
                          const isDynamic = /\{\{\s*\d+\s*\}\}/.test(url)
                          const example = (Array.isArray(b?.example) ? b.example[0] : b?.example) || ''

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Tipo de URL</div>
                                <Select
                                  value={isDynamic ? 'dynamic' : 'static'}
                                  onValueChange={(v) => {
                                    const next = [...buttons]
                                    const nextUrl = v === 'dynamic'
                                      ? (url.includes('{{') ? url : `${url.replace(/\/$/, '')}/{{1}}`)
                                      : url.replace(/\{\{\s*\d+\s*\}\}/g, '').replace(/\/+$/, '')
                                    next[idx] = { ...b, url: nextUrl }
                                    if (v !== 'dynamic') {
                                      delete next[idx].example
                                    } else {
                                      next[idx].example = Array.isArray(b?.example) ? b.example : [example || 'Exemplo 1']
                                    }
                                    updateButtons(next)
                                  }}
                                >
                                  <SelectTrigger className="h-11 w-full bg-zinc-950/40 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="static">Estatico</SelectItem>
                                    <SelectItem value="dynamic">Dinamico</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">URL do site</div>
                                <Input
                                  value={url}
                                  onChange={(e) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, url: e.target.value }
                                    updateButtons(next)
                                  }}
                                  className="h-11 bg-zinc-950/40 border-white/10 text-white"
                                  placeholder="https://www.exemplo.com"
                                />
                              </div>

                              {isDynamic ? (
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-gray-300">Exemplo</div>
                                    <Input
                                      value={example}
                                      onChange={(e) => {
                                        const next = [...buttons]
                                        next[idx] = { ...b, example: [e.target.value] }
                                        updateButtons(next)
                                      }}
                                      className="h-11 bg-zinc-950/40 border-white/10 text-white"
                                      placeholder="Exemplo 1"
                                    />
                                  </div>
                                  <div className="text-xs text-gray-500 self-end">
                                    Use <span className="font-mono">{'{{1}}'}</span> para URL dinamica.
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )
                        }

                        if (type === 'PHONE_NUMBER') {
                          const { country, number } = splitPhone(String(b?.phone_number || ''))
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Pais</div>
                                <Select
                                  value={country}
                                  onValueChange={(v) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, phone_number: joinPhone(v, number) }
                                    updateButtons(next)
                                  }}
                                >
                                  <SelectTrigger className="h-11 w-full bg-zinc-950/40 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="55">BR +55</SelectItem>
                                    <SelectItem value="1">US +1</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Telefone</div>
                                <Input
                                  value={number}
                                  onChange={(e) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, phone_number: joinPhone(country, e.target.value) }
                                    updateButtons(next)
                                  }}
                                  className="h-11 bg-zinc-950/40 border-white/10 text-white"
                                  placeholder="(11) 99999-7777"
                                />
                              </div>
                            </div>
                          )
                        }

                        if (type === 'COPY_CODE') {
                          const maxCodeLength = isLimitedTimeOffer ? 15 : 20
                          const code = String((Array.isArray(b?.example) ? b.example[0] : b?.example) || '')
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Codigo da oferta (max {maxCodeLength})</div>
                                <Input
                                  value={code}
                                  onChange={(e) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, example: clampText(e.target.value, maxCodeLength) }
                                    updateButtons(next)
                                  }}
                                  className="h-11 bg-zinc-950/40 border-white/10 text-white"
                                  placeholder="1234"
                                />
                              </div>
                              <div className="text-xs text-gray-500">
                                O codigo e exibido ao usuario e pode ser copiado.
                              </div>
                            </div>
                          )
                        }

                        if (type === 'FLOW') {
                          const currentFlowId = String(b.flow_id || '')
                          const hasMatch = publishedFlows.some((f) => String(f.meta_flow_id || '') === currentFlowId)
                          const selectValue = hasMatch ? currentFlowId : ''

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">Escolher MiniApp publicado</div>
                                <Select
                                  value={selectValue}
                                  onValueChange={(v) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, flow_id: v }
                                    updateButtons(next)
                                  }}
                                  disabled={flowsQueryIsLoading || publishedFlows.length === 0}
                                >
                                  <SelectTrigger className="h-11 w-full bg-zinc-950/40 border-white/10 text-white">
                                    <SelectValue
                                      placeholder={
                                        flowsQueryIsLoading
                                          ? 'Carregando...'
                                          : (publishedFlows.length === 0 ? 'Nenhum MiniApp publicado' : 'Selecionar')
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {publishedFlows.map((f) => (
                                      <SelectItem key={f.id} value={String(f.meta_flow_id)}>
                                        <div className="flex items-center justify-between gap-2 w-full">
                                          <span className="truncate">{f.name} * {String(f.meta_flow_id)}</span>
                                          {(() => {
                                            const st = (f as any)?.meta_status
                                            const status = st ? String(st) : 'DESCONHECIDO'
                                            const cls =
                                              status === 'PUBLISHED'
                                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20'
                                                : status === 'DRAFT'
                                                  ? 'bg-amber-500/15 text-amber-200 border-amber-500/20'
                                                  : 'bg-white/5 text-gray-300 border-white/10'
                                            return (
                                              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] ${cls}`}>
                                                {status}
                                              </span>
                                            )
                                          })()}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {!hasMatch && currentFlowId ? (
                                  <div className="mt-3 text-[11px] text-amber-300">
                                    O MiniApp atual nao esta publicado. Selecione um da lista.
                                  </div>
                                ) : null}
                                <div className="mt-3 text-[11px] text-gray-500">
                                  Dica: publique o MiniApp no Builder para aparecer na lista.
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-300">flow_action</div>
                                <Select
                                  value={b.flow_action || 'navigate'}
                                  onValueChange={(v) => {
                                    const next = [...buttons]
                                    next[idx] = { ...b, flow_action: v }
                                    updateButtons(next)
                                  }}
                                >
                                  <SelectTrigger className="h-11 w-full bg-zinc-950/40 border-white/10 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="navigate">navigate</SelectItem>
                                    <SelectItem value="data_exchange">data_exchange</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )
                        }

                        return null
                      })()

                      return (
                        <div key={idx} className={rowClassName}>
                          <button
                            type="button"
                            onClick={() => updateButtons(buttons.filter((_, i) => i !== idx))}
                            className="absolute right-4 top-4 h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-white/5"
                            title="Remover"
                            aria-label="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="space-y-4">
                            {headerRow}
                            {bodyRow ? (
                              <div className="pl-8.5">
                                {bodyRow}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}

                    <div className="text-xs text-gray-500">
                      Regras: URL max 2, Ligar max 1, Copiar codigo max 1, OTP max 1; Respostas rapidas ficam agrupadas.
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {counts.total >= maxButtons ? (
          <div className="text-xs text-amber-300">
            Voce ja atingiu o limite de {maxButtons} botoes.
          </div>
        ) : null}
        {buttonErrors.length ? (
          <div className="text-xs text-amber-300 space-y-1">
            {buttonErrors.map((err) => (
              <div key={err}>{err}</div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Advanced panel (LTO, Auth, Carousel) */}
      <div className={`${panelClass} ${panelCompactPadding}`}>
        <details>
          <summary className="cursor-pointer list-none select-none flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Avancado</div>
              <div className="text-xs text-gray-400">Opcoes menos comuns (LTO, Auth e Carousel).</div>
            </div>
            <div className="text-xs text-gray-500">Abrir</div>
          </summary>

          <div className="mt-4 space-y-4">
            {spec.category === 'MARKETING' ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-semibold text-white">Limited Time Offer</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-white/10 bg-zinc-950/40 hover:bg-white/5"
                    onClick={() => {
                      if (spec.limited_time_offer) {
                        update({ limited_time_offer: null })
                        return
                      }

                      const next: Partial<Spec> = { limited_time_offer: { text: '', has_expiration: true } }
                      if (spec.footer) next.footer = null
                      if (header?.format && !['IMAGE', 'VIDEO'].includes(String(header.format))) {
                        next.header = null
                      }

                      update(next)
                    }}
                  >
                    {spec.limited_time_offer ? 'Remover' : 'Adicionar'}
                  </Button>
                </div>
                {spec.limited_time_offer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">Texto (max 16)</label>
                      <Input
                        value={spec.limited_time_offer.text || ''}
                        onChange={(e) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), text: e.target.value } })}
                        className="bg-zinc-950/40 border-white/10 text-white"
                        maxLength={16}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-300">has_expiration</label>
                      <Select
                        value={String(!!spec.limited_time_offer.has_expiration)}
                        onValueChange={(v) => update({ limited_time_offer: { ...(spec.limited_time_offer || {}), has_expiration: v === 'true' } })}
                      >
                        <SelectTrigger className="w-full bg-zinc-950/40 border-white/10 text-white">
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
                {spec.limited_time_offer ? (
                  <div className="text-xs text-gray-500">
                    Regras: body max 600, cabecalho so imagem/video, sem rodape, COPY_CODE max 15.
                  </div>
                ) : null}
                {spec.limited_time_offer && limitedTimeOfferTextTooLong ? (
                  <div className="text-xs text-amber-300">Texto do LTO deve ter ate 16 caracteres.</div>
                ) : null}
                {spec.limited_time_offer && limitedTimeOfferTextMissing ? (
                  <div className="text-xs text-amber-300">Texto do LTO e obrigatorio.</div>
                ) : null}
                {spec.limited_time_offer && limitedTimeOfferCategoryInvalid ? (
                  <div className="text-xs text-amber-300">Limited Time Offer so e permitido em Marketing.</div>
                ) : null}
              </div>
            ) : null}

            {spec.category === 'AUTHENTICATION' ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm font-semibold text-white">Autenticacao (Auth)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-300">message_send_ttl_seconds</label>
                    <Input
                      value={spec.message_send_ttl_seconds ?? ''}
                      onChange={(e) => update({ message_send_ttl_seconds: e.target.value ? Number(e.target.value) : undefined })}
                      className="bg-zinc-950/40 border-white/10 text-white"
                      placeholder="ex: 300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-300">add_security_recommendation</label>
                    <Select
                      value={String(!!spec.add_security_recommendation)}
                      onValueChange={(v) => update({ add_security_recommendation: v === 'true' })}
                    >
                      <SelectTrigger className="w-full bg-zinc-950/40 border-white/10 text-white">
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
                      className="bg-zinc-950/40 border-white/10 text-white"
                      placeholder="ex: 10"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {spec.category !== 'MARKETING' && spec.category !== 'AUTHENTICATION' ? (
              <div className="text-xs text-gray-500">
                Sem opcoes avancadas especificas para esta categoria.
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="text-sm font-semibold text-white">Carousel</div>
              <div className="text-xs text-gray-400">
                Editor visual completo do Carousel vem depois. Por enquanto, voce pode colar o JSON.
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
                      // nao travar digitando
                    }
                  }}
                  className="bg-zinc-950/40 border-white/10 text-white min-h-28 font-mono text-xs"
                  placeholder="Cole aqui um JSON de carousel (opcional)"
                />
              </div>
              {carouselErrors.length ? (
                <div className="text-xs text-amber-300 space-y-1">
                  {carouselErrors.map((err) => (
                    <div key={err}>{err}</div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </>
  )
}
