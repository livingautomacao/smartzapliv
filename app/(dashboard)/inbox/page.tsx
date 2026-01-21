'use client'

/**
 * T040: Inbox Page - Wires hook to view
 * Thin page component following the Page → Hook → View pattern
 *
 * Layout: Full-bleed (no padding, full height) to feel native to the app
 */

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { InboxView } from '@/components/features/inbox'
import { useInbox } from '@/hooks/useInbox'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageLayoutScope } from '@/components/providers/PageLayoutProvider'
import { Loader2, MessageSquare, RefreshCw } from 'lucide-react'

// Dynamic import para modal pesado (~885 linhas) - só carrega quando abre
const AIAgentForm = dynamic(
  () => import('@/components/features/settings/ai-agents').then(m => m.AIAgentForm),
  { ssr: false }
)

/** Full-bleed layout for inbox - no padding, fills available space */
const INBOX_LAYOUT = {
  padded: false,
  width: 'full' as const,
  height: 'full' as const,
  overflow: 'hidden' as const,
  showAccountAlerts: false,
}

function InboxPageContent() {
  const inbox = useInbox()

  return (
    <>
      <InboxView
        // Conversations
        conversations={inbox.conversations}
        isLoadingConversations={inbox.isLoadingConversations}
        totalUnread={inbox.totalUnread}
        // Selected conversation
        selectedConversationId={inbox.selectedConversationId}
        onSelectConversation={inbox.onSelectConversation}
        selectedConversation={inbox.selectedConversation}
        isLoadingSelectedConversation={inbox.isLoadingSelectedConversation}
        // Messages
        messages={inbox.messages}
        isLoadingMessages={inbox.isLoadingMessages}
        isLoadingMoreMessages={inbox.isLoadingMoreMessages}
        hasMoreMessages={inbox.hasMoreMessages}
        onLoadMoreMessages={inbox.onLoadMoreMessages}
        onSendMessage={inbox.onSendMessage}
        isSending={inbox.isSending}
        // Labels
        labels={inbox.labels}
        // Quick Replies
        quickReplies={inbox.quickReplies}
        quickRepliesLoading={inbox.quickRepliesLoading}
        onRefreshQuickReplies={inbox.refetchQuickReplies}
        // Filters
        search={inbox.search}
        onSearchChange={inbox.onSearchChange}
        statusFilter={inbox.statusFilter}
        onStatusFilterChange={inbox.onStatusFilterChange}
        modeFilter={inbox.modeFilter}
        onModeFilterChange={inbox.onModeFilterChange}
        labelFilter={inbox.labelFilter}
        onLabelFilterChange={inbox.onLabelFilterChange}
        // Conversation actions
        onModeToggle={inbox.onModeToggle}
        onCloseConversation={inbox.onCloseConversation}
        onReopenConversation={inbox.onReopenConversation}
        onPriorityChange={inbox.onPriorityChange}
        onLabelToggle={inbox.onLabelToggle}
        // T050: Handoff actions
        onHandoff={inbox.onHandoff}
        onReturnToBot={inbox.onReturnToBot}
        // Delete conversation
        onDeleteConversation={inbox.onDeleteConversation}
        // Configure AI agent
        onConfigureAgent={inbox.onOpenAgentEditor}
        isUpdatingConversation={inbox.isUpdatingConversation}
        isHandingOff={inbox.isHandingOff}
        isReturningToBot={inbox.isReturningToBot}
        isDeletingConversation={inbox.isDeletingConversation}
      />

      {/* AI Agent Edit Modal */}
      <AIAgentForm
        open={inbox.isAgentModalOpen}
        onOpenChange={(open) => !open && inbox.onCloseAgentEditor()}
        agent={inbox.editingAgent}
        onSubmit={inbox.onSaveAgent}
        isSubmitting={inbox.isSavingAgent}
      />
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-[var(--ds-bg-base)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-sm text-[var(--ds-text-muted)]">Carregando inbox...</p>
      </div>
    </div>
  )
}

/**
 * T074: Inbox-specific error fallback with contextual UI
 */
function InboxErrorFallback() {
  const handleReload = () => window.location.reload()

  return (
    <div className="h-full flex items-center justify-center bg-[var(--ds-bg-base)]">
      <div className="max-w-md text-center px-4">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-red-400" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-[var(--ds-text-primary)] mb-2">
          Erro ao carregar o Inbox
        </h2>
        <p className="text-[var(--ds-text-secondary)] mb-6">
          Não foi possível carregar as conversas. Isso pode ser um problema temporário.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>

        {/* Help text */}
        <p className="mt-6 text-xs text-zinc-600">
          Se o problema persistir, verifique sua conexão ou entre em contato com o suporte.
        </p>
      </div>
    </div>
  )
}

export default function InboxPage() {
  return (
    <PageLayoutScope value={INBOX_LAYOUT}>
      <ErrorBoundary fallback={<InboxErrorFallback />}>
        <Suspense fallback={<LoadingFallback />}>
          <InboxPageContent />
        </Suspense>
      </ErrorBoundary>
    </PageLayoutScope>
  )
}
