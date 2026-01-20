/**
 * Support Agent V2 - Using AI SDK v6 patterns
 * Uses generateText + tools for structured output
 * Includes File Search (RAG) integration for knowledge base queries
 *
 * ULTRA LOGGING ENABLED - Remove after debugging
 */

import { generateText, tool } from 'ai'
import { z } from 'zod'
import { createGoogleGenerativeAI, type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase-server'
import { withDevTools, isDevToolsActive } from '@/lib/ai/devtools'
import { DEFAULT_MODEL_ID, supportsFileSearch } from '@/lib/ai/model'
import { validateAndCleanupStore } from '@/lib/ai/file-search-store'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { AIAgent, InboxConversation, InboxMessage } from '@/types'

// =============================================================================
// Ultra Logger
// =============================================================================

class UltraLogger {
  private startTime: number
  private agentName: string
  private logs: string[] = []

  constructor(agentName: string) {
    this.startTime = Date.now()
    this.agentName = agentName
  }

  log(step: string, data?: unknown) {
    const elapsed = Date.now() - this.startTime
    const timestamp = new Date().toISOString()
    const msg = `[${timestamp}] [${elapsed}ms] [${this.agentName}] ${step}`

    if (data !== undefined) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
      console.log(msg, '\n', dataStr)
      this.logs.push(`${msg}\n${dataStr}`)
    } else {
      console.log(msg)
      this.logs.push(msg)
    }
  }

  error(step: string, err: unknown) {
    const elapsed = Date.now() - this.startTime
    const timestamp = new Date().toISOString()
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    const msg = `[${timestamp}] [${elapsed}ms] [${this.agentName}] ❌ ERROR: ${step}\n${errMsg}`
    console.error(msg)
    this.logs.push(msg)
  }

  success(step: string, data?: unknown) {
    const elapsed = Date.now() - this.startTime
    const timestamp = new Date().toISOString()
    const msg = `[${timestamp}] [${elapsed}ms] [${this.agentName}] ✅ ${step}`

    if (data !== undefined) {
      const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
      console.log(msg, '\n', dataStr)
      this.logs.push(`${msg}\n${dataStr}`)
    } else {
      console.log(msg)
      this.logs.push(msg)
    }
  }

  getLogs(): string[] {
    return this.logs
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SupportAgentConfig {
  /** AI Agent configuration from database */
  agent: AIAgent
  /** Conversation context */
  conversation: InboxConversation
  /** Recent messages for context */
  messages: InboxMessage[]
}

export interface SupportAgentResult {
  success: boolean
  response?: SupportResponse
  error?: string
  /** Time taken in milliseconds */
  latencyMs: number
  /** Log ID for reference */
  logId?: string
  /** Debug logs (only in development) */
  debugLogs?: string[]
}

// =============================================================================
// Response Schema (Tool Parameters)
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
// Default Configuration
// =============================================================================

// DEFAULT_MODEL_ID imported from @/lib/ai/model (gemini-3-flash-preview)
const DEFAULT_MAX_TOKENS = 2048
const DEFAULT_TEMPERATURE = 0.7
const FILE_SEARCH_TIMEOUT_MS = 60000 // 60 seconds timeout for File Search

// =============================================================================
// System Prompt Builder
// =============================================================================

/**
 * Returns the system prompt exactly as configured in the UI
 * No enrichment - Google's API handles context automatically
 */
function getSystemPrompt(agent: AIAgent): string {
  return agent.system_prompt
}

// =============================================================================
// AI Log Persistence
// =============================================================================

interface AILogData {
  conversationId: string
  agentId: string
  messageIds: string[]
  input: string
  output: SupportResponse | null
  latencyMs: number
  error: string | null
  modelUsed: string
}

async function persistAILog(data: AILogData): Promise<string | undefined> {
  try {
    const supabase = await createClient()

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
      console.error('[AI Log] Failed to persist:', error)
      return undefined
    }

    return log?.id
  } catch (err) {
    console.error('[AI Log] Error:', err)
    return undefined
  }
}

// =============================================================================
// Message Conversion
// =============================================================================

/**
 * Convert inbox messages to AI SDK message format
 */
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

// =============================================================================
// Support Agent Core (V2 - AI SDK Patterns)
// =============================================================================

/**
 * Process a conversation with the support agent using AI SDK v6 patterns
 * Uses streamText + tools for structured output
 * Includes File Search (RAG) when agent has knowledge base configured
 */
export async function processSupportAgentV2(
  config: SupportAgentConfig
): Promise<SupportAgentResult> {
  const { agent, conversation, messages } = config
  const startTime = Date.now()

  // Initialize ultra logger
  const logger = new UltraLogger(`support-agent:${agent.name}`)

  logger.log('🚀 Starting processSupportAgentV2', {
    agentId: agent.id,
    agentName: agent.name,
    conversationId: conversation.id,
    messageCount: messages.length,
    hasFileSearchStore: !!agent.file_search_store_id,
    fileSearchStoreId: agent.file_search_store_id,
    model: agent.model || DEFAULT_MODEL_ID,
  })

  // Get API key
  logger.log('📍 Step 1: Checking API key...')
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.error('API key not configured', 'Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY')
    return {
      success: false,
      error: 'AI API key not configured',
      latencyMs: Date.now() - startTime,
      debugLogs: logger.getLogs(),
    }
  }
  logger.success('API key found', { keyLength: apiKey.length, keyPrefix: apiKey.slice(0, 8) + '...' })

  // Get the last user message for input logging
  logger.log('📍 Step 2: Processing messages...')
  const lastUserMessage = messages
    .filter((m) => m.direction === 'inbound')
    .slice(-1)[0]
  const inputText = lastUserMessage?.content || ''
  const messageIds = messages.map((m) => m.id)

  logger.log('Messages processed', {
    lastUserMessage: inputText.slice(0, 100) + (inputText.length > 100 ? '...' : ''),
    totalMessages: messages.length,
    inboundMessages: messages.filter(m => m.direction === 'inbound').length,
  })

  // Convert messages to AI SDK format (last 10 for context)
  logger.log('📍 Step 3: Converting messages to AI format...')
  const aiMessages = convertToAIMessages(messages.slice(-10))
  logger.success('Messages converted', {
    aiMessageCount: aiMessages.length,
    messages: aiMessages.map(m => ({ role: m.role, contentLength: m.content.length })),
  })

  // Create model provider
  logger.log('📍 Step 4: Creating Google AI provider...')
  const google = createGoogleGenerativeAI({ apiKey })
  const modelId = agent.model || DEFAULT_MODEL_ID
  logger.success('Provider created', { modelId })

  // Check if DevTools is active
  logger.log('📍 Step 5: Checking DevTools status...')
  const devToolsActive = isDevToolsActive()
  logger.log('DevTools status', { active: devToolsActive })

  // Create model with optional DevTools
  logger.log('📍 Step 6: Creating model instance...')
  const baseModel = google(modelId)
  const model = await withDevTools(baseModel, { name: `support-agent:${agent.name}` })
  logger.success('Model created', {
    modelId,
    withDevTools: devToolsActive,
  })

  // Check if agent has a knowledge base configured AND model supports File Search
  logger.log('📍 Step 7: Checking File Search compatibility...')
  const modelSupportsFS = supportsFileSearch(modelId)
  const hasKnowledgeBase = !!agent.file_search_store_id && modelSupportsFS

  logger.log('File Search check', {
    modelSupportsFS,
    hasFileSearchStoreId: !!agent.file_search_store_id,
    fileSearchStoreId: agent.file_search_store_id,
    hasKnowledgeBase,
  })

  if (agent.file_search_store_id && !modelSupportsFS) {
    logger.log('⚠️ WARNING: Model does not support File Search', {
      model: modelId,
      storeId: agent.file_search_store_id,
    })
  }

  // If using File Search, verify the store exists and has documents
  // IMPORTANT: If verification fails, we MUST disable File Search AND clean up the reference
  let useFileSearch = hasKnowledgeBase && !!agent.file_search_store_id

  if (useFileSearch && agent.file_search_store_id) {
    logger.log('📍 Step 7.1: Validating File Search store with auto-cleanup...')

    const supabaseAdmin = getSupabaseAdmin()
    const validationResult = await validateAndCleanupStore(
      apiKey,
      agent.file_search_store_id,
      supabaseAdmin,
      agent.id
    )

    useFileSearch = validationResult.useFileSearch

    if (validationResult.useFileSearch) {
      logger.success('File Search store validated', {
        status: validationResult.validation.status,
        message: validationResult.validation.message,
        store: validationResult.validation.store ? {
          name: validationResult.validation.store.name,
          activeDocuments: validationResult.validation.store.activeDocumentsCount,
          pendingDocuments: validationResult.validation.store.pendingDocumentsCount,
        } : null,
      })
    } else {
      logger.log('⚠️ File Search DISABLED', {
        status: validationResult.validation.status,
        message: validationResult.validation.message,
        error: validationResult.validation.error,
        cleanupPerformed: validationResult.cleanup?.cleaned || false,
        cleanupAction: validationResult.cleanup?.action,
      })
    }
  }

  let response: SupportResponse | undefined
  let error: string | null = null
  let groundingSources: Array<{ title: string; content: string }> = []

  try {
    // When using File Search, we can't combine with other tools
    // So we use two different approaches:
    // 1. With File Search: use JSON schema for structured output
    // 2. Without File Search: use respond tool

    if (useFileSearch && agent.file_search_store_id) {
      logger.log('📍 Step 8: Executing generateText WITH File Search...')
      logger.log('File Search configuration', {
        storeId: agent.file_search_store_id,
        topK: 5,
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
        systemPromptLength: getSystemPrompt(agent).length,
      })

      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        logger.log('⏰ File Search timeout triggered after ' + FILE_SEARCH_TIMEOUT_MS + 'ms')
        controller.abort()
      }, FILE_SEARCH_TIMEOUT_MS)

      try {
        logger.log('🔄 Calling generateText with File Search...')
        const generateStartTime = Date.now()

        const result = await generateText({
          model,
          system: getSystemPrompt(agent),
          messages: aiMessages,
          tools: {
            file_search: google.tools.fileSearch({
              fileSearchStoreNames: [agent.file_search_store_id],
              topK: 5,
            }),
          },
          temperature: DEFAULT_TEMPERATURE,
          maxOutputTokens: DEFAULT_MAX_TOKENS,
          abortSignal: controller.signal,
        })

        clearTimeout(timeoutId)
        const generateTime = Date.now() - generateStartTime

        logger.success('generateText completed!', {
          generateTimeMs: generateTime,
          textLength: result.text?.length || 0,
          hasText: !!result.text,
          textPreview: result.text?.slice(0, 200) + (result.text?.length > 200 ? '...' : ''),
          finishReason: result.finishReason,
          toolCalls: result.toolCalls?.length || 0,
          toolResults: result.toolResults?.length || 0,
        })

        // Log detailed tool information
        if (result.toolCalls && result.toolCalls.length > 0) {
          logger.log('Tool calls detail', result.toolCalls.map(tc => ({
            toolName: tc.toolName,
            // args may not exist for provider-defined tools like file_search
            argsLength: 'args' in tc ? JSON.stringify(tc.args).length : 0,
          })))
        }

        if (result.toolResults && result.toolResults.length > 0) {
          logger.log('Tool results detail', result.toolResults.map(tr => ({
            toolName: tr.toolName,
            // result may vary for provider-defined tools
            resultType: 'result' in tr ? typeof tr.result : 'unknown',
            resultLength: 'result' in tr ? JSON.stringify(tr.result).length : 0,
          })))
        }

        // Extract grounding metadata
        logger.log('📍 Step 9: Extracting grounding metadata...')
        const providerMetadata = result.providerMetadata as GoogleGenerativeAIProviderMetadata | undefined

        logger.log('Provider metadata', {
          hasProviderMetadata: !!providerMetadata,
          providerMetadataKeys: providerMetadata ? Object.keys(providerMetadata) : [],
        })

        const groundingMetadata = providerMetadata?.groundingMetadata

        logger.log('Grounding metadata', {
          hasGroundingMetadata: !!groundingMetadata,
          groundingMetadataKeys: groundingMetadata ? Object.keys(groundingMetadata) : [],
          hasGroundingChunks: !!groundingMetadata?.groundingChunks,
          groundingChunksCount: groundingMetadata?.groundingChunks?.length || 0,
        })

        if (groundingMetadata?.groundingChunks) {
          groundingSources = groundingMetadata.groundingChunks
            .filter((chunk) => chunk.retrievedContext)
            .map((chunk) => ({
              title: chunk.retrievedContext?.title || 'Documento',
              content: chunk.retrievedContext?.text || '',
            }))

          logger.success('Grounding sources extracted', {
            count: groundingSources.length,
            sources: groundingSources.map(s => ({
              title: s.title,
              contentLength: s.content.length,
              contentPreview: s.content.slice(0, 100),
            })),
          })
        } else {
          logger.log('No grounding chunks found in metadata')
        }

        // Parse text response into structured format
        logger.log('📍 Step 10: Building response object...')
        response = {
          message: result.text,
          sentiment: 'neutral',
          confidence: groundingSources.length > 0 ? 0.9 : 0.5,
          shouldHandoff: false,
          sources: groundingSources,
        }
        logger.success('Response built', {
          messageLength: response.message.length,
          sentiment: response.sentiment,
          confidence: response.confidence,
          sourcesCount: response.sources?.length || 0,
        })

      } catch (generateErr) {
        clearTimeout(timeoutId)

        if (generateErr instanceof Error && generateErr.name === 'AbortError') {
          logger.error('File Search timed out', {
            timeoutMs: FILE_SEARCH_TIMEOUT_MS,
            storeId: agent.file_search_store_id,
          })
          throw new Error(`File Search timeout after ${FILE_SEARCH_TIMEOUT_MS}ms`)
        }

        throw generateErr
      }

    } else {
      // Without File Search: use respond tool for structured output
      logger.log('📍 Step 8: Executing generateText WITHOUT File Search (using respond tool)...')

      const respondTool = tool({
        description: 'Envia uma resposta estruturada ao usuário.',
        inputSchema: supportResponseSchema,
        execute: async (params) => {
          logger.log('🔧 Respond tool executed', {
            messageLength: params.message.length,
            sentiment: params.sentiment,
            confidence: params.confidence,
            shouldHandoff: params.shouldHandoff,
          })
          response = params
          return params
        },
      })

      logger.log('Calling generateText with respond tool...')
      const generateStartTime = Date.now()

      const result = await generateText({
        model,
        system: getSystemPrompt(agent),
        messages: aiMessages,
        tools: {
          respond: respondTool,
        },
        toolChoice: 'required',
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_TOKENS,
      })

      const generateTime = Date.now() - generateStartTime
      logger.success('generateText completed', {
        generateTimeMs: generateTime,
        finishReason: result.finishReason,
        toolCallsCount: result.toolCalls?.length || 0,
      })

      // Response is captured via tool execute
      if (!response) {
        logger.error('Tool was not called', { finishReason: result.finishReason })
        throw new Error('No response generated from AI - tool was not called')
      }

      logger.success('Response captured from tool')
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Processing failed', err)
  }

  const latencyMs = Date.now() - startTime
  logger.log('📍 Final: Processing complete', { latencyMs, hasResponse: !!response, hasError: !!error })

  // If we have a response, persist the log and return success
  if (response) {
    logger.log('📍 Persisting AI log...')
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
    logger.success('Log persisted', { logId })

    return {
      success: true,
      response,
      latencyMs,
      logId,
      debugLogs: process.env.NODE_ENV === 'development' ? logger.getLogs() : undefined,
    }
  }

  // Error case - create auto-handoff response
  logger.log('📍 Creating handoff response due to error...')
  const handoffResponse: SupportResponse = {
    message:
      'Desculpe, estou com dificuldades técnicas no momento. Vou transferir você para um de nossos atendentes.',
    sentiment: 'neutral',
    confidence: 0,
    shouldHandoff: true,
    handoffReason: `Erro técnico: ${error}`,
    handoffSummary: `Cliente estava conversando quando ocorreu erro técnico. Última mensagem: "${inputText.slice(0, 200)}"`,
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

  logger.log('📍 Returning error result', { logId, error })

  return {
    success: false,
    response: handoffResponse,
    error: error || 'Unknown error',
    latencyMs,
    logId,
    debugLogs: process.env.NODE_ENV === 'development' ? logger.getLogs() : undefined,
  }
}
