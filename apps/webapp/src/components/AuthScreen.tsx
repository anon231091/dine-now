'use client';

import { Button, Placeholder, Card } from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { useAuth } from '@/lib/api';
import { User, Utensils } from 'lucide-react';
import { Page } from './Page';

export function AuthScreen() {
  const { login } = useAuth();
  const user = useSignal(initData.user);

  const handleLogin = async () => {
    if (!user) {
      // Show error - should not happen in Telegram
      return;
    }

    await login.mutateAsync({
      telegramId: user.id.toString(),
      firstName: user.first_name,
      lastName: user.last_name || '',
      username: user.username || '',
    });
  };

  return (
    <Page back={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="p-6 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[--tg-theme-button-color] rounded-full flex items-center justify-center">
                <Utensils className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-[--tg-theme-text-color] mb-2">
                Welcome to Restaurant App
              </h1>
              <p className="text-[--tg-theme-hint-color] mb-4">
                Order delicious food from the best restaurants in Cambodia
              </p>
            </div>

            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-3 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
                  <User className="w-5 h-5 text-[--tg-theme-hint-color]" />
                  <span className="text-[--tg-theme-text-color]">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                
                <Button
                  mode="filled"
                  size="l"
                  stretched
                  loading={login.isPending}
                  onClick={handleLogin}
                >
                  Continue as {user.first_name}
                </Button>
              </div>
            ) : (
              <Placeholder
                header="Authentication Required"
                description="Please open this app through Telegram to continue"
              />
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
