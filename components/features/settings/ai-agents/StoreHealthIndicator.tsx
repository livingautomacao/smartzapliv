'use client'

/**
 * StoreHealthIndicator - Shows File Search Store health status
 * Fetches health data from the API and displays a badge with status
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { StoreHealthResponse } from '@/app/api/ai-agents/[id]/store-health/route'

export interface StoreHealthIndicatorProps {
  agentId: string
  className?: string
  /** Callback when health status changes */
  onHealthChange?: (health: StoreHealthResponse['health']) => void
}

const healthConfig = {
  healthy: {
    label: 'RAG Ativo',
    description: 'File Search funcionando normalmente',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  degraded: {
    label: 'RAG Parcial',
    description: 'File Search com limitações',
    icon: AlertCircle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  unavailable: {
    label: 'RAG Indisponível',
    description: 'File Search não está funcionando',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  not_configured: {
    label: 'RAG não configurado',
    description: 'Adicione arquivos para habilitar RAG',
    icon: HelpCircle,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
  },
} as const

export function StoreHealthIndicator({
  agentId,
  className,
  onHealthChange,
}: StoreHealthIndicatorProps) {
  const [health, setHealth] = useState<StoreHealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    if (!agentId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai-agents/${agentId}/store-health`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch health')
      }

      const data: StoreHealthResponse = await response.json()
      setHealth(data)
      onHealthChange?.(data.health)
    } catch (err) {
      console.error('[StoreHealthIndicator] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [agentId, onHealthChange])

  // Fetch on mount and when agentId changes
  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-zinc-500', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Verificando RAG...</span>
      </div>
    )
  }

  // Error state
  if (error || !health) {
    return (
      <TooltipProvider>
        <div className={cn('flex items-center gap-2', className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Erro</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{error || 'Não foi possível verificar o status'}</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchHealth}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TooltipProvider>
    )
  }

  const config = healthConfig[health.health]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                config.bgColor,
                config.color
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{config.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="text-xs font-medium">{config.description}</p>

              {health.validation && (
                <p className="text-xs text-zinc-400">
                  {health.validation.message}
                </p>
              )}

              {health.recommendations.length > 0 && (
                <div className="pt-1 border-t border-zinc-700">
                  <p className="text-xs font-medium text-yellow-400 mb-1">
                    Recomendações:
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-0.5">
                    {health.recommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {health.indexedFilesCount > 0 && (
                <p className="text-xs text-zinc-500">
                  {health.indexedFilesCount} arquivo(s) indexados
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
          onClick={fetchHealth}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>
    </TooltipProvider>
  )
}
