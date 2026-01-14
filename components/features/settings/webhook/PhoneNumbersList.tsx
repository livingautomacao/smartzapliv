'use client';

import React from 'react';
import { Phone, Loader2, AlertTriangle } from 'lucide-react';
import { PhoneNumber } from '../../../../hooks/useSettings';
import { getWebhookStatus, getWebhookFunnelLevels, getCardColor } from './utils';
import { PhoneNumberCard } from './PhoneNumberCard';

interface PhoneNumbersListProps {
  phoneNumbers?: PhoneNumber[];
  phoneNumbersLoading?: boolean;
  computedWebhookUrl?: string;
  isSavingOverride: boolean;
  onSetZapflowWebhook: (phoneId: string) => Promise<boolean | void>;
  onRemoveOverride: (phoneId: string) => Promise<boolean | void>;
  onSetCustomOverride: (phoneId: string, url: string) => Promise<boolean | void>;
}

export function PhoneNumbersList({
  phoneNumbers,
  phoneNumbersLoading,
  computedWebhookUrl,
  isSavingOverride,
  onSetZapflowWebhook,
  onRemoveOverride,
  onSetCustomOverride,
}: PhoneNumbersListProps) {
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return null;
  }

  // Check for numbers with external webhook
  const numbersWithExternalWebhook = phoneNumbers.filter((phone) => {
    const status = getWebhookStatus(phone, computedWebhookUrl);
    return status.status === 'other';
  });

  return (
    <>
      {/* Warning Banner - Webhook pointing to another system */}
      {numbersWithExternalWebhook.length > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-300 mb-1">
                Webhook apontando para outro sistema
              </h4>
              <p className="text-sm text-amber-200/80">
                {numbersWithExternalWebhook.length === 1
                  ? `O número ${numbersWithExternalWebhook[0].display_phone_number} está enviando webhooks para outro sistema.`
                  : `${numbersWithExternalWebhook.length} números estão enviando webhooks para outros sistemas.`}{' '}
                Os status de entrega (Entregue, Lido) <strong>não serão atualizados</strong>{' '}
                neste app.
              </p>
              <p className="text-xs text-amber-300/60 mt-2">
                Clique em "Ativar Prioridade #1" no número afetado para corrigir.
              </p>
            </div>
          </div>
        </div>
      )}

      <h4 className="font-medium text-white mb-3 flex items-center gap-2">
        <Phone size={16} className="text-gray-400" />
        Seus Números
      </h4>

      {phoneNumbersLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          Carregando números...
        </div>
      ) : (
        <div className="space-y-3">
          {phoneNumbers.map((phone) => {
            const webhookStatus = getWebhookStatus(phone, computedWebhookUrl);
            const funnelLevels = getWebhookFunnelLevels(phone, computedWebhookUrl);
            const cardColor = getCardColor(webhookStatus);

            return (
              <PhoneNumberCard
                key={phone.id}
                phone={phone}
                webhookStatus={webhookStatus}
                funnelLevels={funnelLevels}
                cardColor={cardColor}
                computedWebhookUrl={computedWebhookUrl}
                isSavingOverride={isSavingOverride}
                onSetZapflowWebhook={onSetZapflowWebhook}
                onRemoveOverride={onRemoveOverride}
                onSetCustomOverride={onSetCustomOverride}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
