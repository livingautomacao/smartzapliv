'use client'

import { useSearchParams } from 'next/navigation'
import { useSubmissionsController } from '@/hooks/useSubmissions'
import { SubmissionsView } from '@/components/features/submissions/SubmissionsView'

export default function SubmissionsPage() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId') || undefined
  const flowId = searchParams.get('flowId') || undefined

  const controller = useSubmissionsController({
    campaignId,
    flowId,
  })

  // Ajusta título/descrição baseado nos filtros
  const title = campaignId
    ? 'Submissões da Campanha'
    : flowId
      ? 'Submissões do Flow'
      : 'Todas as Submissões'

  const description = campaignId || flowId
    ? 'Respostas filtradas por campanha ou flow'
    : 'Todas as respostas dos formulários MiniApp'

  return (
    <SubmissionsView
      controller={controller}
      title={title}
      description={description}
      campaignId={campaignId}
      flowId={flowId}
    />
  )
}
