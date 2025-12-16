import type { ReactNode } from 'react'

export type MetaDiagnosticsCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export type MetaDiagnosticsAction = {
  id: string
  label: string
  kind: 'link' | 'api'
  href?: string
  method?: 'POST' | 'DELETE'
  endpoint?: string
  body?: unknown
}

export type MetaDiagnosticsCheck = {
  id: string
  title: string
  status: MetaDiagnosticsCheckStatus
  message: string
  details?: Record<string, unknown>
  actions?: MetaDiagnosticsAction[]
}

export type MetaDiagnosticsResponse = {
  ok: boolean
  ts: string
  env?: Record<string, unknown>
  webhook?: {
    expectedUrl?: string
    verifyTokenPreview?: string
  } | null
  whatsapp?: {
    credentialsSource?: string
    businessAccountId?: string | null
    phoneNumberId?: string | null
    accessTokenPreview?: string | null
  } | null
  checks: MetaDiagnosticsCheck[]
  meta?: Record<string, unknown> | null
  internal?: Record<string, unknown> | null
  report?: { text?: string } | null
}

export const metaDiagnosticsService = {
  get: async (): Promise<MetaDiagnosticsResponse> => {
    const res = await fetch('/api/meta/diagnostics', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = (json as any)?.error || 'Falha ao carregar diagnóstico'
      throw new Error(msg)
    }

    return json as MetaDiagnosticsResponse
  },

  runAction: async (action: MetaDiagnosticsAction): Promise<unknown> => {
    if (action.kind !== 'api') throw new Error('Ação inválida (não é API)')
    if (!action.endpoint) throw new Error('Ação inválida: endpoint ausente')

    const method = action.method || 'POST'

    const res = await fetch(action.endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: action.body ? JSON.stringify(action.body) : undefined,
    })

    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const baseMsg = (json as any)?.error || `Falha ao executar ação (${method})`
      const details = (json as any)?.details || null
      const code = details?.code || details?.error?.code || null
      const userTitle = details?.error_user_title || details?.error?.error_user_title || null
      const userMsg = details?.error_user_msg || details?.error?.error_user_msg || null

      const parts = [
        userTitle ? String(userTitle) : null,
        String(baseMsg),
        userMsg ? String(userMsg) : null,
        code ? `(código ${String(code)})` : null,
      ].filter(Boolean)

      throw new Error(parts.join(' — '))
    }

    return json
  },
}
