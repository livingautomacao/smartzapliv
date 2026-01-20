/**
 * GET /api/ai-agents/[id]/store-health
 * Health check endpoint for File Search Store
 *
 * Returns the current status of the agent's File Search Store,
 * including validation results and any issues detected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { validateFileSearchStore, type StoreValidationResult } from '@/lib/ai/file-search-store'
import { supportsFileSearch } from '@/lib/ai/model'

interface RouteContext {
  params: Promise<{ id: string }>
}

export interface StoreHealthResponse {
  /** Agent ID */
  agentId: string
  /** Agent name */
  agentName: string
  /** Model used by the agent */
  model: string
  /** Whether the model supports File Search */
  modelSupportsFileSearch: boolean
  /** File Search Store ID (if configured) */
  fileSearchStoreId: string | null
  /** Overall health status */
  health: 'healthy' | 'degraded' | 'unavailable' | 'not_configured'
  /** Detailed validation result */
  validation?: StoreValidationResult
  /** Number of indexed files in database */
  indexedFilesCount: number
  /** Recommendations for fixing issues */
  recommendations: string[]
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<StoreHealthResponse | { error: string }>> {
  try {
    const { id } = await context.params
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id, name, model, file_search_store_id')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // Get indexed files count
    const { count: indexedFilesCount } = await supabase
      .from('ai_knowledge_files')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)
      .eq('indexing_status', 'completed')

    const modelId = agent.model || 'gemini-3-flash-preview'
    const modelSupportsFS = supportsFileSearch(modelId)
    const recommendations: string[] = []

    // Build response based on configuration
    const baseResponse: Omit<StoreHealthResponse, 'health' | 'validation'> = {
      agentId: agent.id,
      agentName: agent.name,
      model: modelId,
      modelSupportsFileSearch: modelSupportsFS,
      fileSearchStoreId: agent.file_search_store_id,
      indexedFilesCount: indexedFilesCount || 0,
      recommendations,
    }

    // Case 1: No File Search Store configured
    if (!agent.file_search_store_id) {
      if ((indexedFilesCount || 0) > 0) {
        recommendations.push(
          'Existem arquivos indexados no banco mas sem File Search Store. Recrie o store para habilitar RAG.'
        )
      }

      return NextResponse.json({
        ...baseResponse,
        health: 'not_configured',
        recommendations,
      })
    }

    // Case 2: Model doesn't support File Search
    if (!modelSupportsFS) {
      recommendations.push(
        `O modelo ${modelId} não suporta File Search. Use gemini-3-flash-preview, gemini-3-pro-preview ou gemini-2.5-pro.`
      )

      return NextResponse.json({
        ...baseResponse,
        health: 'degraded',
        recommendations,
      })
    }

    // Case 3: Validate the File Search Store
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        ...baseResponse,
        health: 'unavailable',
        validation: {
          isValid: false,
          status: 'error',
          message: 'API key não configurada',
        },
        recommendations: ['Configure GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY'],
      })
    }

    const validation = await validateFileSearchStore(apiKey, agent.file_search_store_id)

    // Build recommendations based on validation result
    switch (validation.status) {
      case 'not_found':
        recommendations.push(
          'O File Search Store não existe. Faça upload de novos arquivos para recriar o store.'
        )
        break

      case 'permission_denied':
        recommendations.push(
          'Sem permissão para acessar o store. Verifique se a API key está correta e tem permissões adequadas.'
        )
        break

      case 'no_documents':
        recommendations.push(
          'O store existe mas não possui documentos. Faça upload de arquivos na seção Base de Conhecimento.'
        )
        break

      case 'error':
        recommendations.push(
          `Erro ao verificar store: ${validation.error || 'erro desconhecido'}`
        )
        break
    }

    // Determine health status
    let health: StoreHealthResponse['health']
    if (validation.isValid) {
      health = 'healthy'
    } else if (validation.status === 'no_documents') {
      health = 'degraded' // Store exists but empty
    } else {
      health = 'unavailable'
    }

    return NextResponse.json({
      ...baseResponse,
      health,
      validation,
      recommendations,
    })
  } catch (error) {
    console.error('[store-health] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
