'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { backButton } from '@telegram-apps/sdk-react';

interface BackButtonConfig {
  // Pages where back button should be hidden
  hideOnPaths?: string[];
  // Pages where back button should be shown (if not specified, shows on all pages except hideOnPaths)
  showOnPaths?: string[];
  // Custom back handler
  onBack?: () => void;
}

export function useBackButton(config: BackButtonConfig = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    hideOnPaths = ['/'], // Hide on home page by default
    showOnPaths,
    onBack
  } = config;

  useEffect(() => {
    const shouldShow = showOnPaths 
      ? showOnPaths.includes(pathname)
      : !hideOnPaths.includes(pathname);

    if (shouldShow) {
      backButton.show();
    } else {
      backButton.hide();
    }

    // Cleanup when component unmounts or path changes
    return () => {
      backButton.hide();
    };
  }, [pathname, hideOnPaths, showOnPaths]);

  useEffect(() => {
    const handleBack = onBack || (() => router.back());
    
    if (backButton.onClick.isAvailable()) {
      return backButton.onClick(handleBack);
    }
  }, [router, onBack]);
}
