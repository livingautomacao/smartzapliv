import { z } from 'zod'

const GRAPH_VERSION = 'v24.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

export type MetaFlowsCreateResult = {
  id: string
  success: boolean
  validation_errors?: unknown
}

export type MetaFlowsBasicResult = {
  success: boolean
  validation_errors?: unknown
}

export type MetaFlowsPreviewResult = {
  id: string
  preview?: {
    preview_url?: string
    expires_at?: string
  }
}

export type MetaFlowsDetails = {
  id: string
  name?: string
  status?: string
  categories?: string[]
  validation_errors?: unknown
  json_version?: string
  data_api_version?: string
  endpoint_uri?: string
}

const GraphErrorSchema = z
  .object({
    error: z
      .object({
        message: z.string().optional(),
        type: z.string().optional(),
        code: z.number().optional(),
        error_subcode: z.number().optional(),
        fbtrace_id: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export class MetaGraphApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'MetaGraphApiError'
    this.status = status
    this.data = data
  }
}

async function readJsonSafe(res: Response): Promise<any> {
  return await res.json().catch(() => null)
}

function buildGraphErrorMessage(data: any, fallback: string): string {
  const parsed = GraphErrorSchema.safeParse(data)
  if (parsed.success) {
    const msg = parsed.data?.error?.message
    const code = parsed.data?.error?.code
    const subcode = parsed.data?.error?.error_subcode
    if (msg && code) return `${fallback}: (${code}) ${msg}`
    if (msg && subcode) return `${fallback}: (${subcode}) ${msg}`
    if (msg) return `${fallback}: ${msg}`
  }
  return fallback
}

function normalizeFlowJson(flowJson: unknown): unknown {
  // A API da Meta espera que `flow_json` seja uma string contendo um JSON *objeto*.
  // No nosso DB (JSONB) pode acabar ficando como string (p.ex. quando alguém salvou o JSON
  // como texto em algum lugar). Isso causaria double-encode e erro (100) Invalid parameter.
  if (flowJson == null) {
    throw new Error('Flow JSON vazio. Gere o JSON pelo modo “Formulário” ou salve um JSON válido no painel Avançado.')
  }

  if (typeof flowJson === 'string') {
    const trimmed = flowJson.trim()
    if (!trimmed) {
      throw new Error('Flow JSON vazio. Gere o JSON pelo modo “Formulário” ou salve um JSON válido no painel Avançado.')
    }
    try {
      return JSON.parse(trimmed)
    } catch {
      throw new Error('Flow JSON inválido: esperado um objeto JSON (não texto livre). Salve o JSON no painel Avançado.')
    }
  }

  // number/boolean também não fazem sentido aqui.
  if (typeof flowJson !== 'object') {
    throw new Error('Flow JSON inválido: esperado um objeto JSON.')
  }

  return flowJson
}

export async function metaCreateFlow(params: {
  accessToken: string
  wabaId: string
  name: string
  categories: string[]
  flowJson: unknown
  publish: boolean
}): Promise<MetaFlowsCreateResult> {
  const normalizedFlowJson = normalizeFlowJson(params.flowJson)
  const body = {
    name: params.name,
    categories: params.categories,
    flow_json: JSON.stringify(normalizedFlowJson),
    publish: params.publish,
  }

  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(params.wabaId)}/flows`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao criar Flow na Meta'), res.status, data)

  // Resposta esperada: { id, success, validation_errors? }
  const id = typeof data?.id === 'string' ? data.id : String(data?.id || '')
  return {
    id,
    success: !!data?.success,
    validation_errors: data?.validation_errors,
  }
}

export async function metaUpdateFlowMetadata(params: {
  accessToken: string
  flowId: string
  name?: string
  categories?: string[]
}): Promise<MetaFlowsBasicResult> {
  const body: any = {}
  if (params.name) body.name = params.name
  if (params.categories && params.categories.length > 0) body.categories = params.categories

  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(params.flowId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao atualizar metadados do Flow na Meta'), res.status, data)

  return { success: !!data?.success, validation_errors: data?.validation_errors }
}

export async function metaUploadFlowJsonAsset(params: {
  accessToken: string
  flowId: string
  flowJson: unknown
}): Promise<MetaFlowsBasicResult> {
  const normalizedFlowJson = normalizeFlowJson(params.flowJson)
  const fd = new FormData()

  // A Meta exige multipart com arquivo application/json e asset_type FLOW_JSON.
  const blob = new Blob([JSON.stringify(normalizedFlowJson)], { type: 'application/json' })
  fd.append('file', blob, 'flow.json')
  fd.append('name', 'flow.json')
  fd.append('asset_type', 'FLOW_JSON')

  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(params.flowId)}/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: fd,
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao enviar Flow JSON para a Meta'), res.status, data)

  return { success: !!data?.success, validation_errors: data?.validation_errors }
}

export async function metaPublishFlow(params: { accessToken: string; flowId: string }): Promise<MetaFlowsBasicResult> {
  const res = await fetch(`${GRAPH_BASE}/${encodeURIComponent(params.flowId)}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao publicar Flow na Meta'), res.status, data)

  return { success: !!data?.success, validation_errors: data?.validation_errors }
}

export async function metaGetFlowPreview(params: { accessToken: string; flowId: string }): Promise<MetaFlowsPreviewResult> {
  // docs: GET {FLOW-ID}?fields=preview.invalidate(false)
  const url = `${GRAPH_BASE}/${encodeURIComponent(params.flowId)}?fields=preview.invalidate(false)`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao gerar preview do Flow na Meta'), res.status, data)

  return {
    id: typeof data?.id === 'string' ? data.id : String(data?.id || ''),
    preview: data?.preview,
  }
}

export async function metaGetFlowDetails(params: {
  accessToken: string
  flowId: string
}): Promise<MetaFlowsDetails> {
  const fields = [
    'id',
    'name',
    'categories',
    'preview',
    'status',
    'validation_errors',
    'json_version',
    'data_api_version',
    'endpoint_uri',
  ].join(',')

  const url = `${GRAPH_BASE}/${encodeURIComponent(params.flowId)}?fields=${encodeURIComponent(fields)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  })

  const data = await readJsonSafe(res)
  if (!res.ok) throw new MetaGraphApiError(buildGraphErrorMessage(data, 'Falha ao buscar detalhes do Flow na Meta'), res.status, data)

  return {
    id: typeof data?.id === 'string' ? data.id : String(data?.id || ''),
    name: typeof data?.name === 'string' ? data.name : undefined,
    status: typeof data?.status === 'string' ? data.status : undefined,
    categories: Array.isArray(data?.categories) ? data.categories.map(String) : undefined,
    validation_errors: data?.validation_errors,
    json_version: typeof data?.json_version === 'string' ? data.json_version : undefined,
    data_api_version: typeof data?.data_api_version === 'string' ? data.data_api_version : undefined,
    endpoint_uri: typeof data?.endpoint_uri === 'string' ? data.endpoint_uri : undefined,
  }
}
