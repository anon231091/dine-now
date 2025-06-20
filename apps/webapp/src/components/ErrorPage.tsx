'use client';

import { Card, Title, Subheadline, Button } from '@telegram-apps/telegram-ui';
import { AlertTriangle } from 'lucide-react';

export function ErrorPage(
  { error, reset }: {
    error: Error & { digest?: string },
    reset: () => void
  }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[--tg-theme-bg-color]">
      <Card className="max-w-sm w-full p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <Title level="2" className="text-[--tg-theme-text-color] mb-2">
          Oops! Something went wrong
        </Title>
        
        <Subheadline level="2" className="text-[--tg-theme-hint-color] mb-4">
          {error?.message || 'An unexpected error occurred'}
        </Subheadline>
        
        <div className="space-y-3">
          <Button
            mode="filled"
            size="l"
            stretched
            onClick={reset}
          >
            Reload Page
          </Button>
        </div>
      </Card>
    </div>
  );
}
