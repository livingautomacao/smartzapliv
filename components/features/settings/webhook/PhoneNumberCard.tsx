'use client';

import React, { useState } from 'react';
import {
  Phone,
  ChevronDown,
  Zap,
  Trash2,
  Loader2,
  Check,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react';
import { PhoneNumber } from '../../../../hooks/useSettings';
import { WebhookStatus, WebhookFunnelLevel, CardColor } from './types';
import { getCardColorClasses } from './utils';
import { WebhookFunnelVisualization } from './WebhookFunnelVisualization';

interface PhoneNumberCardProps {
  phone: PhoneNumber;
  webhookStatus: WebhookStatus;
  funnelLevels: WebhookFunnelLevel[];
  cardColor: CardColor;
  computedWebhookUrl?: string;
  isSavingOverride: boolean;
  onSetZapflowWebhook: (phoneId: string) => Promise<boolean | void>;
  onRemoveOverride: (phoneId: string) => Promise<boolean | void>;
  onSetCustomOverride: (phoneId: string, url: string) => Promise<boolean | void>;
}

export function PhoneNumberCard({
  phone,
  webhookStatus,
  funnelLevels,
  cardColor,
  isSavingOverride,
  onSetZapflowWebhook,
  onRemoveOverride,
  onSetCustomOverride,
}: PhoneNumberCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFunnelExpanded, setIsFunnelExpanded] = useState(false);
  const [overrideUrl, setOverrideUrl] = useState('');
  const [isLocalSaving, setIsLocalSaving] = useState(false);

  const colors = getCardColorClasses(cardColor);

  const handleSetOverride = async () => {
    if (!overrideUrl.trim()) return;
    setIsLocalSaving(true);
    try {
      await onSetCustomOverride(phone.id, overrideUrl.trim());
      setIsEditing(false);
      setOverrideUrl('');
    } finally {
      setIsLocalSaving(false);
    }
  };

  const isBusy = isSavingOverride || isLocalSaving;

  return (
    <div
      className={'border rounded-xl overflow-hidden transition-all ' + colors.bg + ' ' + colors.border}
    >
      {/* Header Row - Always visible */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={'p-2.5 rounded-xl ' + colors.icon}>
              <Phone size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-white">{phone.display_phone_number}</div>
              <div className="text-sm text-gray-400 truncate">
                {phone.verified_name || 'Sem nome verificado'}
              </div>
              {/* Status line */}
              <div className={'text-xs mt-1.5 flex items-center gap-1.5 ' + colors.text}>
                {webhookStatus.status === 'smartzap' ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>SmartZap capturando eventos</span>
                  </>
                ) : webhookStatus.status === 'other' ? (
                  <>
                    <AlertCircle size={12} />
                    <span>Outro sistema no nível #1</span>
                  </>
                ) : webhookStatus.level === 2 ? (
                  <>
                    <Circle size={12} />
                    <span>Usando webhook da WABA</span>
                  </>
                ) : webhookStatus.level === 3 ? (
                  <>
                    <Circle size={12} />
                    <span>Usando fallback do App</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    <span>Nenhum webhook configurado</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Level Badge - Clickable to expand funnel */}
            <button
              onClick={() => setIsFunnelExpanded(!isFunnelExpanded)}
              className={
                'px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all hover:ring-2 hover:ring-white/20 ' +
                (cardColor === 'emerald'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : cardColor === 'amber'
                    ? 'bg-amber-500/20 text-amber-400'
                    : cardColor === 'blue'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-zinc-700 text-gray-300')
              }
              title="Clique para ver o funil completo"
            >
              {webhookStatus.level > 0 && (
                <span className="font-bold">#{webhookStatus.level}</span>
              )}
              {webhookStatus.status === 'smartzap' ? 'SmartZap' : webhookStatus.levelName}
              <ChevronDown
                size={12}
                className={'transition-transform ' + (isFunnelExpanded ? 'rotate-180' : '')}
              />
            </button>

            {/* Actions */}
            {!isEditing && (
              <>
                {webhookStatus.status !== 'smartzap' && (
                  <button
                    onClick={() => onSetZapflowWebhook(phone.id)}
                    disabled={isBusy}
                    className="h-10 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isBusy ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Zap size={12} />
                    )}
                    Ativar Prioridade #1
                  </button>
                )}
                {(webhookStatus.status === 'smartzap' || webhookStatus.status === 'other') && (
                  <button
                    onClick={() => onRemoveOverride(phone.id)}
                    disabled={isBusy}
                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Remover override (voltar para padrão)"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Funnel Visualization - Expandable */}
      {isFunnelExpanded && !isEditing && (
        <WebhookFunnelVisualization funnelLevels={funnelLevels} />
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="px-4 pb-4">
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                URL do Webhook (deve ser HTTPS)
              </label>
              <input
                type="url"
                value={overrideUrl}
                onChange={(e) => setOverrideUrl(e.target.value)}
                placeholder="https://seu-sistema.com/webhook"
                className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-lg text-sm font-mono text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setOverrideUrl('');
                }}
                className="h-10 px-4 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSetOverride}
                disabled={isLocalSaving || !overrideUrl.trim()}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isLocalSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
