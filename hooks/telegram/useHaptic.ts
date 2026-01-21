'use client';

import { useCallback } from 'react';
import { useTelegramSDK } from '@/components/telegram/TelegramSDKProvider';

/**
 * Hook para haptic feedback
 * Vibra o dispositivo em diferentes intensidades
 */
export function useHaptic() {
  const { hapticFeedback, isMock } = useTelegramSDK();

  const impact = useCallback(
    (style: 'light' | 'medium' | 'heavy' = 'medium') => {
      hapticFeedback(style);
    },
    [hapticFeedback]
  );

  const notification = useCallback(
    (type: 'success' | 'warning' | 'error') => {
      hapticFeedback(type);
    },
    [hapticFeedback]
  );

  const selection = useCallback(() => {
    hapticFeedback('light');
  }, [hapticFeedback]);

  return {
    impact,
    notification,
    selection,
    isMock,
  };
}
