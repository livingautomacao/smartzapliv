/**
 * Support Agent V2 - Tool-based RAG (Vercel AI SDK pattern)
 *
 * Usa RAG próprio com Supabase pgvector seguindo o padrão recomendado pela Vercel:
 * - O LLM recebe uma tool `searchKnowledgeBase` e DECIDE quando usá-la
 * - Para saudações ("oie") → responde direto, sem buscar
 * - Para perguntas ("qual o horário?") → chama a tool, depois responde
 *
 * Isso é mais eficiente que "eager RAG" (sempre buscar) porque:
 * - Reduz latência em mensagens que não precisam de contexto
 * - Reduz custos de embedding (menos queries)
 * - Evita injetar ruído em conversas simples
 */

import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// NOTE: AI dependencies are imported DYNAMICALLY inside processSupportAgentV2
// This is required because static imports can cause issues when called from
// background contexts (like debounced webhook handlers)

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

  // Dynamic imports - required for background execution context
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
  const { generateText, tool, stepCountIs } = await import('ai')
  const { withDevTools } = await import('@/lib/ai/devtools')
  const {
    findRelevantContent,
    hasIndexedContent,
    buildEmbeddingConfigFromAgent,
    buildRerankConfigFromAgent,
  } = await import('@/lib/ai/rag-store')

  // Get API key from database only (never use env vars for multi-tenant SaaS)
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return {
      success: false,
      error: 'Database connection not available',
      latencyMs: Date.now() - startTime,
    }
  }

  const { data: geminiSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'gemini_api_key')
    .maybeSingle()

  const apiKey = geminiSetting?.value
  if (!apiKey) {
    return {
      success: false,
      error: 'API key não configurada. Configure em Configurações > IA.',
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

  // Check if agent has indexed content in pgvector
  const hasKnowledgeBase = await hasIndexedContent(agent.id)

  console.log(`[support-agent] Processing: model=${modelId}, hasKnowledgeBase=${hasKnowledgeBase}`)
  console.log(`[support-agent] Total messages received: ${messages.length}`)
  console.log(`[support-agent] Last user message: "${inputText.slice(0, 100)}..."`)

  let response: SupportResponse | undefined
  let error: string | null = null
  let sources: Array<{ title: string; content: string }> | undefined

  try {
    // =======================================================================
    // TOOL-BASED RAG: LLM decides when to search
    // =======================================================================

    // Use agent's system prompt as-is (model decides when to use tools)
    const systemPrompt = agent.system_prompt

    // Define respond tool (required for structured output)
    const respondTool = tool({
      description: 'Envia uma resposta estruturada ao usuário. SEMPRE use esta ferramenta para responder.',
      inputSchema: supportResponseSchema,
      execute: async (params) => {
        response = {
          ...params,
          sources: sources || params.sources,
        }
        return { success: true, message: params.message }
      },
    })

    // Knowledge base search tool - only created if agent has indexed content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let searchKnowledgeBaseTool: any = undefined

    if (hasKnowledgeBase) {
      searchKnowledgeBaseTool = tool({
        description: 'Busca informações na base de conhecimento do agente. Use para responder perguntas que precisam de dados específicos.',
        inputSchema: z.object({
          query: z.string().describe('A pergunta ou termos de busca para encontrar informações relevantes'),
        }),
        execute: async ({ query }) => {
          console.log(`[support-agent] LLM requested knowledge search: "${query.slice(0, 100)}..."`)
          const ragStartTime = Date.now()

          // Build configs
          const embeddingConfig = buildEmbeddingConfigFromAgent(agent, apiKey)
          const rerankConfig = await buildRerankConfigFromAgent(agent)

          // Search
          const relevantContent = await findRelevantContent({
            agentId: agent.id,
            query,
            embeddingConfig,
            rerankConfig,
            topK: agent.rag_max_results || 5,
            threshold: agent.rag_similarity_threshold || 0.5,
          })

          console.log(`[support-agent] RAG search completed in ${Date.now() - ragStartTime}ms, found ${relevantContent.length} chunks`)

          if (relevantContent.length === 0) {
            return { found: false, message: 'Nenhuma informação relevante encontrada na base de conhecimento.' }
          }

          // Track sources for logging
          sources = relevantContent.map((r, i) => ({
            title: `Fonte ${i + 1}`,
            content: r.content.slice(0, 200) + '...',
          }))

          // Return formatted content for LLM to use
          const contextText = relevantContent
            .map((r, i) => `[${i + 1}] ${r.content}`)
            .join('\n\n')

          return {
            found: true,
            content: contextText,
            sourceCount: relevantContent.length,
          }
        },
      })
    }

    // Build tools object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = { respond: respondTool }
    if (searchKnowledgeBaseTool) {
      tools.searchKnowledgeBase = searchKnowledgeBaseTool
    }

    console.log(`[support-agent] Generating response with tools: ${Object.keys(tools).join(', ')}`)

    // Generate with multi-step support (LLM can search, then respond)
    await generateText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      tools,
      ...(searchKnowledgeBaseTool ? { stopWhen: stepCountIs(3) } : {}), // Allow: search → think → respond
      temperature: agent.temperature ?? DEFAULT_TEMPERATURE,
      maxOutputTokens: agent.max_tokens ?? DEFAULT_MAX_TOKENS,
    })

    if (!response) {
      throw new Error('No response generated - LLM did not call respond tool')
    }

    console.log(`[support-agent] Response generated: "${response.message.slice(0, 100)}..."`)
    if (sources) {
      console.log(`[support-agent] Used ${sources.length} knowledge base sources`)
    } else {
      console.log(`[support-agent] No knowledge base search performed`)
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
