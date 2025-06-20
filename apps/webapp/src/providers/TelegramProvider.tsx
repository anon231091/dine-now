// packages/webapp/src/providers/TelegramProvider.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  SDKProvider,
  useLaunchParams,
  useMiniApp,
  useThemeParams,
  useInitData,
  useMainButton,
  useBackButton,
  useHapticFeedback,
  useViewport,
  useCloudStorage,
  DisplayGate,
  type User,
} from '@telegram-apps/sdk-react';

interface TelegramContextType {
  isReady: boolean;
  user: User | null;
  initDataRaw: string | null;
  startParam: string | null;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
  impactHaptic: (style?: 'light' | 'medium' | 'heavy') => void;
  notificationHaptic: (type?: 'error' | 'success' | 'warning') => void;
  expand: () => void;
  close: () => void;
  ready: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

// Inner provider that uses SDK hooks
function TelegramInnerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  
  const launchParams = useLaunchParams();
  const miniApp = useMiniApp();
  const initData = useInitData();
  const mainButton = useMainButton();
  const backButton = useBackButton();
  const hapticFeedback = useHapticFeedback();
  const viewport = useViewport();
  const themeParams = useThemeParams();

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set theme
        if (themeParams.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Expand viewport
        if (viewport) {
          viewport.expand();
        }

        // Ready the app
        if (miniApp) {
          miniApp.ready();
        }

        setIsReady(true);
        console.log('✅ Telegram Mini App SDK React v3 initialized');
        
      } catch (error) {
        console.error('❌ Failed to initialize Telegram SDK:', error);
        
        // For development, continue without Telegram
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development mode: continuing without Telegram SDK');
          setIsReady(true);
        }
      }
    };

    initializeApp();
  }, [miniApp, viewport, themeParams]);

  // Handle theme changes
  useEffect(() => {
    if (themeParams.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeParams.isDark]);

  const showMainButton = (text: string, onClick: () => void) => {
    if (mainButton) {
      mainButton.setParams({
        text,
        isVisible: true,
        isEnabled: true,
      });
      
      // Remove existing listeners and add new one
      mainButton.off('click');
      mainButton.on('click', onClick);
    }
  };

  const hideMainButton = () => {
    if (mainButton) {
      mainButton.hide();
      mainButton.off('click');
    }
  };

  const showBackButton = (onClick: () => void) => {
    if (backButton) {
      backButton.show();
      
      // Remove existing listeners and add new one
      backButton.off('click');
      backButton.on('click', onClick);
    }
  };

  const hideBackButton = () => {
    if (backButton) {
      backButton.hide();
      backButton.off('click');
    }
  };

  const impactHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (hapticFeedback) {
      hapticFeedback.impactOccurred(style);
    }
  };

  const notificationHaptic = (type: 'error' | 'success' | 'warning' = 'success') => {
    if (hapticFeedback) {
      hapticFeedback.notificationOccurred(type);
    }
  };

  const expand = () => {
    if (viewport) {
      viewport.expand();
    }
  };

  const close = () => {
    if (miniApp) {
      miniApp.close();
    }
  };

  const ready = () => {
    if (miniApp) {
      miniApp.ready();
    }
  };

  const setHeaderColor = (color: string) => {
    if (miniApp) {
      miniApp.setHeaderColor(color);
    }
  };

  const setBackgroundColor = (color: string) => {
    if (miniApp) {
      miniApp.setBackgroundColor(color);
    }
  };

  const contextValue: TelegramContextType = {
    isReady,
    user: initData?.user || null,
    initDataRaw: initData?.raw || null,
    startParam: initData?.startParam || launchParams?.startParam || null,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    impactHaptic,
    notificationHaptic,
    expand,
    close,
    ready,
    setHeaderColor,
    setBackgroundColor,
  };

  return (
    <TelegramContext.Provider value={contextValue}>
      {children}
    </TelegramContext.Provider>
  );
}

// Main provider component
interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  return (
    <SDKProvider acceptCustomStyles debug={process.env.NODE_ENV === 'development'}>
      <DisplayGate error={ErrorBoundary} loading={LoadingScreen} initial={LoadingScreen}>
        <TelegramInnerProvider>{children}</TelegramInnerProvider>
      </DisplayGate>
    </SDKProvider>
  );
}

// Error boundary component
function ErrorBoundary() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
      <div className="text-center">
        <h1 className="text-xl font-bold text-red-800 mb-2">
          Failed to initialize Telegram Mini App
        </h1>
        <p className="text-red-600">
          Please make sure you're opening this app through Telegram.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-sm text-red-500 mt-2">
            Development mode: Check console for more details.
          </p>
        )}
      </div>
    </div>
  );
}

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[--tg-theme-bg-color]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[--tg-theme-link-color] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-[--tg-theme-hint-color]">Initializing Telegram Mini App...</p>
      </div>
    </div>
  );
}

// Main hook
export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

// Additional hooks for specific SDK features
export function useHapticFeedback() {
  const { impactHaptic, notificationHaptic } = useTelegram();
  return { impactHaptic, notificationHaptic };
}

export function useMainButton() {
  const { showMainButton, hideMainButton } = useTelegram();
  return { showMainButton, hideMainButton };
}

export function useBackButton() {
  const { showBackButton, hideBackButton } = useTelegram();
  return { showBackButton, hideBackButton };
}

// Re-export SDK React hooks for direct use
export {
  useInitData,
  useViewport,
  useThemeParams,
  useCloudStorage,
  useMiniApp,
  useLaunchParams,
} from '@telegram-apps/sdk-react';

export default TelegramProvider;
