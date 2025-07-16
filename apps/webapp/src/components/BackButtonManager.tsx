'use client';

import { useBackButton } from '@/hooks/useBackButton';

export function BackButtonManager() {
  // Configure which pages should show/hide the back button
  useBackButton({
    hideOnPaths: [
      '/', // Home page
      '/menu' // Menu page (if it's the main page after scanning QR)
    ],
    showOnPaths: [
      // You can explicitly specify paths that should show back button
      // If not specified, it will show on all pages except hideOnPaths
    ],
    // Optional: custom back handler
    onBack: () => {
      // Custom logic if needed, otherwise defaults to router.back()
    }
  });

  // This component doesn't render anything
  return null;
}
