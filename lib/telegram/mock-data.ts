// =============================================================================
// TELEGRAM MINI APP - MOCK DATA
// Dados fake para desenvolvimento sem Supabase
// =============================================================================

// -----------------------------------------------------------------------------
// TIPOS
// -----------------------------------------------------------------------------

export type ConversationStatus = 'ai_active' | 'human_active' | 'handoff_requested' | 'resolved';
export type MessageDirection = 'inbound' | 'outbound';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MockConversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  status: ConversationStatus;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isTyping?: boolean;
}

export interface MockMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  content: string;
  messageType: 'text' | 'image' | 'audio';
  deliveryStatus: DeliveryStatus;
  createdAt: Date;
  isAiGenerated?: boolean;
}

export interface MockTelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode: string;
  isPremium: boolean;
  photoUrl?: string;
  role: 'admin' | 'operator' | 'viewer';
  isLinked: boolean;
}

// -----------------------------------------------------------------------------
// DADOS MOCK - USUÁRIO TELEGRAM
// -----------------------------------------------------------------------------

export const MOCK_TELEGRAM_USER: MockTelegramUser = {
  id: 123456789,
  firstName: 'Dev',
  lastName: 'User',
  username: 'devuser',
  languageCode: 'pt',
  isPremium: true,
  role: 'admin',
  isLinked: true, // Mude para false para testar fluxo de vinculação
};

// -----------------------------------------------------------------------------
// DADOS MOCK - CONVERSAS
// -----------------------------------------------------------------------------

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: 'conv_1',
    contactName: 'Maria Souza',
    contactPhone: '+5511999991111',
    status: 'handoff_requested',
    lastMessage: 'Preciso falar com um atendente humano, por favor!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 2), // 2 min atrás
    unreadCount: 3,
  },
  {
    id: 'conv_2',
    contactName: 'João Silva',
    contactPhone: '+5511999992222',
    status: 'ai_active',
    lastMessage: 'Obrigado pela informação sobre o produto!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min atrás
    unreadCount: 0,
    isTyping: true,
  },
  {
    id: 'conv_3',
    contactName: 'Pedro Costa',
    contactPhone: '+5511999993333',
    status: 'human_active',
    lastMessage: 'Vou verificar isso para você agora mesmo',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 45), // 45 min atrás
    unreadCount: 0,
  },
  {
    id: 'conv_4',
    contactName: 'Ana Oliveira',
    contactPhone: '+5511999994444',
    status: 'resolved',
    lastMessage: 'Perfeito, muito obrigada pela ajuda!',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2h atrás
    unreadCount: 0,
  },
  {
    id: 'conv_5',
    contactName: 'Carlos Ferreira',
    contactPhone: '+5511999995555',
    status: 'ai_active',
    lastMessage: 'Qual o prazo de entrega para minha região?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min atrás
    unreadCount: 1,
  },
];

// -----------------------------------------------------------------------------
// DADOS MOCK - MENSAGENS
// -----------------------------------------------------------------------------

export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  conv_1: [
    {
      id: 'msg_1_1',
      conversationId: 'conv_1',
      direction: 'inbound',
      content: 'Olá, boa tarde!',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
      id: 'msg_1_2',
      conversationId: 'conv_1',
      direction: 'outbound',
      content: 'Olá Maria! Sou a assistente virtual do SmartZap. Como posso ajudar você hoje?',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 9),
      isAiGenerated: true,
    },
    {
      id: 'msg_1_3',
      conversationId: 'conv_1',
      direction: 'inbound',
      content: 'Tenho um problema com meu pedido #12345',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 8),
    },
    {
      id: 'msg_1_4',
      conversationId: 'conv_1',
      direction: 'outbound',
      content: 'Entendo, Maria. Deixa eu verificar o status do seu pedido #12345. Um momento, por favor.',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 7),
      isAiGenerated: true,
    },
    {
      id: 'msg_1_5',
      conversationId: 'conv_1',
      direction: 'inbound',
      content: 'Preciso falar com um atendente humano, por favor!',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 2),
    },
  ],
  conv_2: [
    {
      id: 'msg_2_1',
      conversationId: 'conv_2',
      direction: 'inbound',
      content: 'Oi, quero saber sobre o produto premium',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 20),
    },
    {
      id: 'msg_2_2',
      conversationId: 'conv_2',
      direction: 'outbound',
      content: 'Olá João! O produto premium custa R$ 99,90/mês e inclui acesso ilimitado a todas as funcionalidades. Posso te ajudar com mais alguma informação?',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 19),
      isAiGenerated: true,
    },
    {
      id: 'msg_2_3',
      conversationId: 'conv_2',
      direction: 'inbound',
      content: 'Obrigado pela informação sobre o produto!',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  ],
  conv_3: [
    {
      id: 'msg_3_1',
      conversationId: 'conv_3',
      direction: 'inbound',
      content: 'Meu pagamento não foi processado',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
    },
    {
      id: 'msg_3_2',
      conversationId: 'conv_3',
      direction: 'outbound',
      content: 'Olá Pedro! Vou verificar o que aconteceu com seu pagamento.',
      messageType: 'text',
      deliveryStatus: 'read',
      createdAt: new Date(Date.now() - 1000 * 60 * 55),
      isAiGenerated: true,
    },
    {
      id: 'msg_3_3',
      conversationId: 'conv_3',
      direction: 'outbound',
      content: 'Vou verificar isso para você agora mesmo',
      messageType: 'text',
      deliveryStatus: 'delivered',
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
      isAiGenerated: false, // Mensagem do atendente humano
    },
  ],
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

export function getConversationById(id: string): MockConversation | undefined {
  return MOCK_CONVERSATIONS.find(c => c.id === id);
}

export function getMessagesByConversationId(conversationId: string): MockMessage[] {
  return MOCK_MESSAGES[conversationId] || [];
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getStatusEmoji(status: ConversationStatus): string {
  const emojis: Record<ConversationStatus, string> = {
    ai_active: '🤖',
    human_active: '👤',
    handoff_requested: '🚨',
    resolved: '✅',
  };
  return emojis[status];
}

export function getStatusLabel(status: ConversationStatus): string {
  const labels: Record<ConversationStatus, string> = {
    ai_active: 'IA Ativo',
    human_active: 'Humano',
    handoff_requested: 'Quer Humano',
    resolved: 'Resolvido',
  };
  return labels[status];
}

export function getStatusColor(status: ConversationStatus): string {
  const colors: Record<ConversationStatus, string> = {
    ai_active: 'text-blue-500',
    human_active: 'text-green-500',
    handoff_requested: 'text-red-500',
    resolved: 'text-gray-500',
  };
  return colors[status];
}
