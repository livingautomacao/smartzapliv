'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const panelClass = 'rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_12px_30px_rgba(0,0,0,0.35)]'
const panelPadding = 'p-6'

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

type Spec = {
  name?: string
  language?: string
  category?: string
  parameter_format?: 'positional' | 'named'
  header?: any
  body?: { text?: string; example?: any }
  footer?: { text?: string } | null
  buttons?: any[]
  limited_time_offer?: any
}

interface StepConfigProps {
  id: string
  spec: Spec
  update: (patch: Partial<Spec>) => void
  variableMode: 'positional' | 'named'
  headerType: string
  headerText: string
  bodyText: string
  footerText: string
  sanitizePlaceholdersByMode: (text: string, mode: 'positional' | 'named') => string
  notifySanitized: () => void
  normalizeButtons: (input: any[]) => any[]
  buttons: any[]
  newButtonForType: (type: ButtonType) => any
  defaultBodyExamples: (text: string) => string[][] | undefined
  stripAllPlaceholders: (text: string) => string
  header: any
  isNameValid: boolean
}

export function StepConfig({
  id,
  spec,
  update,
  variableMode,
  headerType,
  headerText,
  bodyText,
  footerText,
  sanitizePlaceholdersByMode,
  notifySanitized,
  normalizeButtons,
  buttons,
  newButtonForType,
  defaultBodyExamples,
  stripAllPlaceholders,
  header,
  isNameValid,
}: StepConfigProps) {
  return (
    <div className={`${panelClass} ${panelPadding} min-h-140`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-white">Nome e idioma do modelo</div>
          <div className="text-xs text-gray-400 mt-0.5">Defina como o modelo sera identificado.</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Nome</label>
          <Input
            value={spec.name || ''}
            onChange={(e) => update({ name: e.target.value })}
            className={`bg-zinc-950/40 text-white ${
              isNameValid ? 'border-white/10' : 'border-amber-400/40'
            }`}
          />
          <p className="text-xs text-gray-500">Apenas <span className="font-mono">a-z 0-9 _</span></p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Categoria</label>
          <Select
            value={spec.category}
            onValueChange={(v) => {
              const nextCategory = String(v)
              const nextAllowedButtons = new Set<ButtonType>(
                nextCategory === 'AUTHENTICATION'
                  ? ['OTP']
                  : [
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
                    ],
              )
              const nextButtons = buttons.filter((b) => nextAllowedButtons.has(b?.type as ButtonType))
              if (nextCategory === 'AUTHENTICATION' && nextButtons.length === 0) {
                nextButtons.push(newButtonForType('OTP'))
              }
              update({
                category: v,
                buttons: normalizeButtons(nextButtons),
                limited_time_offer: nextCategory === 'MARKETING' ? spec.limited_time_offer : null,
              })
            }}
          >
            <SelectTrigger className="w-full bg-zinc-950/40 border-white/10 text-white">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MARKETING">Marketing</SelectItem>
              <SelectItem value="UTILITY">Utilidade</SelectItem>
              <SelectItem value="AUTHENTICATION">Autenticacao</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">Idioma</label>
          <Select value={spec.language} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger className="w-full bg-zinc-950/40 border-white/10 text-white">
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
          <label className="text-xs font-medium text-gray-300">Tipo de variavel</label>
          <Select
            value={variableMode}
            onValueChange={(v) => {
              const mode = v as 'positional' | 'named'
              const next: Partial<Spec> = { parameter_format: mode }
              if (headerType === 'TEXT') {
                const cleanedHeader = sanitizePlaceholdersByMode(headerText, mode)
                if (cleanedHeader !== headerText) {
                  next.header = { ...(header || { format: 'TEXT' }), format: 'TEXT', text: cleanedHeader, example: header?.example ?? null }
                  notifySanitized()
                }
              }
              const cleanedBody = sanitizePlaceholdersByMode(bodyText, mode)
              if (cleanedBody !== bodyText) {
                const example = defaultBodyExamples(cleanedBody)
                next.body = { ...(spec.body || {}), text: cleanedBody, example: example ? { body_text: example } : undefined }
                notifySanitized()
              }
              if (spec.footer?.text) {
                const cleanedFooter = stripAllPlaceholders(footerText)
                if (cleanedFooter !== footerText) {
                  next.footer = { ...(spec.footer || {}), text: cleanedFooter }
                  notifySanitized()
                }
              }
              update(next)
            }}
          >
            <SelectTrigger className="w-full bg-zinc-950/40 border-white/10 text-white">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positional">Numero</SelectItem>
              <SelectItem value="named">Nome (avancado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        ID do rascunho: <span className="font-mono">{id}</span>
      </div>
    </div>
  )
}
