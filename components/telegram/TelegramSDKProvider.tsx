'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { MOCK_TELEGRAM_USER, type MockTelegramUser } from '@/lib/telegram/mock-data';

// =============================================================================
// TYPES
// =============================================================================

interface ThemeParams {
  backgroundColor: string;
  textColor: string;
  hintColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  secondaryBackgroundColor: string;
}

interface TelegramSDKContextType {
  // Estado
  isReady: boolean;
  isMock: boolean;
  isDark: boolean;

  // Usuário
  user: MockTelegramUser | null;
  isLinked: boolean;

  // Theme
  themeParams: ThemeParams;

  // Actions
  setIsLinked: (linked: boolean) => void;
  showAlert: (message: string) => void;
  showConfirm: (message: string) => Promise<boolean>;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  close: () => void;
  expand: () => void;
}

// =============================================================================
// DEFAULT THEME (Dark mode - estilo Telegram)
// =============================================================================

const DARK_THEME: ThemeParams = {
  backgroundColor: '#18181b',      // zinc-900
  textColor: '#fafafa',            // zinc-50
  hintColor: '#a1a1aa',            // zinc-400
  linkColor: '#60a5fa',            // blue-400
  buttonColor: '#22c55e',          // green-500 (primary SmartZap)
  buttonTextColor: '#ffffff',
  secondaryBackgroundColor: '#27272a', // zinc-800
};

const LIGHT_THEME: ThemeParams = {
  backgroundColor: '#ffffff',
  textColor: '#18181b',
  hintColor: '#71717a',
  linkColor: '#2563eb',
  buttonColor: '#16a34a',
  buttonTextColor: '#ffffff',
  secondaryBackgroundColor: '#f4f4f5',
};

// =============================================================================
// CONTEXT
// =============================================================================

const TelegramSDKContext = createContext<TelegramSDKContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface TelegramSDKProviderProps {
  children: ReactNode;
}

export function TelegramSDKProvider({ children }: TelegramSDKProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isLinked, setIsLinked] = useState(MOCK_TELEGRAM_USER.isLinked);

  // Detectar se estamos no Telegram real ou mock
  const isMock = typeof window !== 'undefined' && !window.Telegram?.WebApp;

  // Theme baseado no modo dark/light
  const themeParams = isDark ? DARK_THEME : LIGHT_THEME;

  // Inicialização
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Se estiver no Telegram real, usar SDK
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      setIsDark(tg.colorScheme === 'dark');
      setIsReady(true);
      console.log('📱 Telegram WebApp initialized');
      return;
    }

    // Mock mode
    console.log('🤖 Telegram Mock Mode - Simulating Mini App environment');

    // Simular delay de inicialização
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Aplicar CSS variables do theme
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--tg-theme-bg-color', themeParams.backgroundColor);
    root.style.setProperty('--tg-theme-text-color', themeParams.textColor);
    root.style.setProperty('--tg-theme-hint-color', themeParams.hintColor);
    root.style.setProperty('--tg-theme-link-color', themeParams.linkColor);
    root.style.setProperty('--tg-theme-button-color', themeParams.buttonColor);
    root.style.setProperty('--tg-theme-button-text-color', themeParams.buttonTextColor);
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondaryBackgroundColor);

    // Aplicar classe dark
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeParams, isDark]);

  // Actions
  const showAlert = (message: string) => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(`[Telegram Alert]\n${message}`);
    }
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showConfirm(message, resolve);
      } else {
        resolve(confirm(`[Telegram Confirm]\n${message}`));
      }
    });
  };

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      if (['light', 'medium', 'heavy'].includes(type)) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
      } else {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(type as 'success' | 'warning' | 'error');
      }
    } else {
      console.log(`📳 Haptic: ${type}`);
    }
  };

  const close = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    } else {
      console.log('🚪 Mini App would close here');
      showAlert('Mini App fechado (mock)');
    }
  };

  const expand = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
    } else {
      console.log('📐 Mini App expanded (mock)');
    }
  };

  const contextValue: TelegramSDKContextType = {
    isReady,
    isMock,
    isDark,
    user: MOCK_TELEGRAM_USER,
    isLinked,
    themeParams,
    setIsLinked,
    showAlert,
    showConfirm,
    hapticFeedback,
    close,
    expand,
  };

  return (
    <TelegramSDKContext.Provider value={contextValue}>
      {children}
    </TelegramSDKContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useTelegramSDK() {
  const context = useContext(TelegramSDKContext);
  if (!context) {
    throw new Error('useTelegramSDK must be used within TelegramSDKProvider');
  }
  return context;
}

// =============================================================================
// TYPES DECLARATION (para window.Telegram)
// =============================================================================

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        colorScheme: 'light' | 'dark';
        themeParams: ThemeParams;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
          selectionChanged: () => void;
        };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
      };
    };
  }
}
