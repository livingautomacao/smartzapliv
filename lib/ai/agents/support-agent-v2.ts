/**
 * Support Agent V2 - Simple Two-Step Approach
 *
 * Step 1: If has knowledge base, use file_search to get context
 * Step 2: Use respond tool to generate structured response
 *
 * File Search CANNOT be combined with other tools - that's why we need two steps.
 */

import { generateText, tool } from 'ai'
import { z } from 'zod'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getSupabaseAdmin } from '@/lib/supabase'
import { withDevTools } from '@/lib/ai/devtools'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// =============================================================================
// Types
// =============================================================================

export interface SupportAgentConfig {
  agent: AIAgent
  conversation: InboxConversation
  messages: InboxMessage[]
}

export interface SupportAgentResult {
  success: boolean
  response?: SupportResponse
  error?: string
  latencyMs: number
  logId?: string
}

// =============================================================================
// Response Schema
// =============================================================================

const supportResponseSchema = z.object({
  message: z.string().describe('A resposta para enviar ao usuário'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'frustrated'])
    .describe('Sentimento detectado na mensagem do usuário'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Nível de confiança na resposta (0 = incerto, 1 = certo)'),
  shouldHandoff: z
    .boolean()
    .describe('Se deve transferir para um atendente humano'),
  handoffReason: z
    .string()
    .optional()
    .describe('Motivo da transferência para humano'),
  handoffSummary: z
    .string()
    .optional()
    .describe('Resumo da conversa para o atendente'),
  sources: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .describe('Fontes utilizadas para gerar a resposta'),
})

export type SupportResponse = z.infer<typeof supportResponseSchema>

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MODEL_ID = 'gemini-2.5-flash'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 2048

// =============================================================================
// Helpers
// =============================================================================

function convertToAIMessages(
  messages: InboxMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.message_type !== 'internal_note')
    .map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))
}

async function persistAILog(data: {
  conversationId: string
  agentId: string
  messageIds: string[]
  input: string
  output: SupportResponse | null
  latencyMs: number
  error: string | null
  modelUsed: string
}): Promise<string | undefined> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      console.error('[support-agent] Supabase admin client not available')
      return undefined
    }
    const { data: log, error } = await supabase
      .from('ai_agent_logs')
      .insert({
        conversation_id: data.conversationId,
        ai_agent_id: data.agentId,
        input_message: data.input,
        output_message: data.output?.message || null,
        response_time_ms: data.latencyMs,
        model_used: data.modelUsed,
        tokens_used: null,
        sources_used: data.output?.sources || null,
        error_message: data.error,
        metadata: {
          messageIds: data.messageIds,
          sentiment: data.output?.sentiment,
          confidence: data.output?.confidence,
          shouldHandoff: data.output?.shouldHandoff,
          handoffReason: data.output?.handoffReason,
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('[support-agent] Failed to persist log:', error)
      return undefined
    }
    return log?.id
  } catch (err) {
    console.error('[support-agent] Log error:', err)
    return undefined
  }
}

// =============================================================================
// Main Function
// =============================================================================

export async function processSupportAgentV2(
  config: SupportAgentConfig
): Promise<SupportAgentResult> {
  const { agent, conversation, messages } = config
  const startTime = Date.now()

  // Get API key
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'API key not configured',
      latencyMs: Date.now() - startTime,
    }
  }

  // Setup
  const lastUserMessage = messages.filter((m) => m.direction === 'inbound').slice(-1)[0]
  const inputText = lastUserMessage?.content || ''
  const messageIds = messages.map((m) => m.id)
  const aiMessages = convertToAIMessages(messages.slice(-10))

  const google = createGoogleGenerativeAI({ apiKey })
  const modelId = agent.model || DEFAULT_MODEL_ID
  const baseModel = google(modelId)
  const model = await withDevTools(baseModel, { name: `agente:${agent.name}` })

  const hasKnowledgeBase = !!agent.file_search_store_id

  console.log(`[support-agent] Processing: model=${modelId}, hasKnowledgeBase=${hasKnowledgeBase}`)

  let response: SupportResponse | undefined
  let error: string | null = null

  try {
    if (hasKnowledgeBase && agent.file_search_store_id) {
      // =======================================================================
      // WITH KNOWLEDGE BASE: Use file_search (returns plain text)
      // =======================================================================
      console.log(`[support-agent] Using File Search with store: ${agent.file_search_store_id}`)
      console.log(`[support-agent] Calling Gemini API with prompt: "${inputText.slice(0, 50)}..."`)
      console.log(`[support-agent] System prompt length: ${agent.system_prompt?.length || 0} chars`)

      const fileSearchStartTime = Date.now()

      // File Search funciona melhor com prompt único (mesmo padrão do teste)
      // O histórico da conversa é incluído no system prompt se necessário
      const result = await generateText({
        model,
        system: agent.system_prompt,
        prompt: inputText, // Usar prompt único ao invés de messages array
        tools: {
          file_search: google.tools.fileSearch({
            fileSearchStoreNames: [agent.file_search_store_id],
            topK: 5,
          }),
        },
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
        abortSignal: AbortSignal.timeout(25000), // 25s timeout (Vercel max é 30s)
      })

      console.log(`[support-agent] File Search completed in ${Date.now() - fileSearchStartTime}ms`)

      console.log(`[support-agent] Gemini API responded, text length: ${result.text?.length ?? 0}`)

      // Create structured response from plain text
      response = {
        message: result.text || 'Desculpe, não consegui gerar uma resposta.',
        sentiment: 'neutral',
        confidence: 0.8,
        shouldHandoff: false,
      }

      console.log(`[support-agent] File Search response: ${response.message.slice(0, 100)}...`)

    } else {
      // =======================================================================
      // WITHOUT KNOWLEDGE BASE: Use respond tool for structured output
      // =======================================================================
      console.log(`[support-agent] Using respond tool (no knowledge base)`)

      const respondTool = tool({
        description: 'Envia uma resposta estruturada ao usuário.',
        inputSchema: supportResponseSchema,
        execute: async (params) => {
          response = params
          return params
        },
      })

      await generateText({
        model,
        system: agent.system_prompt,
        messages: aiMessages,
        tools: { respond: respondTool },
        toolChoice: 'required',
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
      })

      if (!response) {
        throw new Error('No response generated')
      }

      console.log(`[support-agent] Respond tool response: ${response.message.slice(0, 100)}...`)
    }

  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[support-agent] Error:', error)
  }

  const latencyMs = Date.now() - startTime

  // Success case
  if (response) {
    const logId = await persistAILog({
      conversationId: conversation.id,
      agentId: agent.id,
      messageIds,
      input: inputText,
      output: response,
      latencyMs,
      error: null,
      modelUsed: modelId,
    })

    return { success: true, response, latencyMs, logId }
  }

  // Error case - auto handoff
  const handoffResponse: SupportResponse = {
    message: 'Desculpe, estou com dificuldades técnicas. Vou transferir você para um atendente.',
    sentiment: 'neutral',
    confidence: 0,
    shouldHandoff: true,
    handoffReason: `Erro técnico: ${error}`,
    handoffSummary: `Erro durante processamento. Última mensagem: "${inputText.slice(0, 200)}"`,
  }

  const logId = await persistAILog({
    conversationId: conversation.id,
    agentId: agent.id,
    messageIds,
    input: inputText,
    output: handoffResponse,
    latencyMs,
    error,
    modelUsed: modelId,
  })

  return {
    success: false,
    response: handoffResponse,
    error: error || 'Unknown error',
    latencyMs,
    logId,
  }
}
