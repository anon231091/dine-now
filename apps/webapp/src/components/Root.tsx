'use client';

import { type PropsWithChildren } from 'react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Toaster } from 'react-hot-toast';

import { useDidMount } from '@/hooks/useDidMount';

export function Root({ children }: PropsWithChildren) {
  // Unfortunately, Telegram Mini Apps does not allow us to use all features of
  // the Server Side Rendering. That's why we are showing loader on the server
  // side.
  const didMount = useDidMount();

  return didMount ? (
      <AppRoot> 
        <main className="pb-16">
          {children}
        </main>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              borderRadius: '8px',
              padding: '12px',
            },
            success: {
              iconTheme: {
                primary: 'var(--tg-theme-link-color)',
                secondary: 'var(--tg-theme-button-text-color)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--tg-theme-destructive-text-color)',
                secondary: 'var(--tg-theme-button-text-color)',
              },
            },
          }}
        />
      </AppRoot>
  ): (
    <div className="root__loading flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--tg-theme-link-color] mx-auto mb-4"></div>
        <p className="text-[--tg-theme-hint-color]">Loading...</p>
      </div>
    </div>
  );
}
