'use client';

import { useEffect, useState } from 'react';
import { useAuth, useRestaurantByTableId } from '@/lib/api';
import { useAuthStore, useRestaurantStore, useUIStore } from '@/store';
import { Spinner } from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { RestaurantSelection } from '@/components/RestaurantSelection';
import { MenuView } from '@/components/MenuView';
import { AuthScreen } from '@/components/AuthScreen';
import { Page } from '@/components/Page';

export default function HomePage() {
  const tableId = useSignal(initData.startParam);
  const user = useSignal(initData.user);
  const { isAuthenticated } = useAuthStore();
  const { currentRestaurant } = useRestaurantStore();
  const { setCurrentPage } = useUIStore();
  
  const [initializing, setInitializing] = useState(true);
  
  const { data: restaurantData, isLoading: loadingRestaurant } = useRestaurantByTableId(tableId || '');
  const auth = useAuth();

  useEffect(() => {
    setCurrentPage('/');
  }, [setCurrentPage]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // check restaurant data
        if (restaurantData?.data?.data) {
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
  }, [user, restaurantData, isAuthenticated]);

  // Show loading while initializing
  if (initializing || auth.login.isPending || loadingRestaurant) {
    return (
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {loadingRestaurant ? 'Loading restaurant...' : 'Initializing...'}
            </p>
          </div>
        </div>
      </Page>
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
