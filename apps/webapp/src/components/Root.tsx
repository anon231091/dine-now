'use client';

import { type PropsWithChildren, useEffect } from "react";
import { AppRoot } from '@telegram-apps/telegram-ui';
import {
  initData,
  miniApp,
  useLaunchParams,
  useSignal,
} from '@telegram-apps/sdk-react';

import { setLocale } from '@/core/i18n/locale';
import { useDidMount } from '@/hooks/useDidMount';
import { BottomNavigation } from '@/components/Navigation';

export function Root({ children }: PropsWithChildren) {
  const lp = useLaunchParams();
  const didMount = useDidMount();

  const isDark = useSignal(miniApp.isDark);
  const initDataUser = useSignal(initData.user);

  // Set the user locale.
  useEffect(() => {
    initDataUser && setLocale(initDataUser.language_code);
  }, [initDataUser]);

  return didMount ? (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <main className="pb-16">
        {children}
      </main>
      <BottomNavigation />
    </AppRoot>
  ) : (
    <div className="root__loading">
      <div className="root__loading-spinner" />
    </div>
  );
}
