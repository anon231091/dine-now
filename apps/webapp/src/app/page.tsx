'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth, useRestaurantByQR } from '../lib/api';
import { useAuthStore, useRestaurantStore, useUIStore } from '../store';
import { Placeholder, Spinner } from '@telegram-apps/telegram-ui';
import { RestaurantSelection } from '../components/RestaurantSelection';
import { MenuView } from '../components/MenuView';
import { AuthScreen } from '../components/AuthScreen';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady, startParam } = useTelegram();
  const { isAuthenticated } = useAuthStore();
  const { currentRestaurant } = useRestaurantStore();
  const { setCurrentPage } = useUIStore();
  
  const [initializing, setInitializing] = useState(true);
  
  // Get QR code from multiple possible sources
  const qrCode = startParam || 
                 searchParams.get('startapp') || 
                 searchParams.get('tgWebAppStartParam');
  
  const { data: restaurantData, isLoading: loadingRestaurant } = useRestaurantByQR(qrCode || '');
  const auth = useAuth();

  useEffect(() => {
    setCurrentPage('/');
  }, [setCurrentPage]);

  useEffect(() => {
    const initializeApp = async () => {
      if (!isReady) return;

      try {
        // If QR code is provided, load restaurant data
        if (qrCode && restaurantData?.data?.data) {
          const { restaurant, table } = restaurantData.data.data;
          useRestaurantStore.getState().setRestaurant(restaurant);
          useRestaurantStore.getState().setTable(table);
        }

        // Auto-authenticate with Telegram user data
        if (user && !isAuthenticated) {
          await auth.login.mutateAsync({
            telegramId: user.id.toString(),
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
          });
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setInitializing(false);
      }
    };

    initializeApp();
  }, [isReady, user, qrCode, restaurantData, isAuthenticated]);

  // Show loading while initializing
  if (!isReady || initializing || auth.login.isPending || loadingRestaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="l" />
          <p className="mt-4 text-[--tg-theme-hint-color]">
            {loadingRestaurant ? 'Loading restaurant...' : 'Initializing...'}
          </p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show restaurant selection if no restaurant is selected
  if (!currentRestaurant) {
    return <RestaurantSelection />;
  }

  // Show main menu view
  return <MenuView />;
}
