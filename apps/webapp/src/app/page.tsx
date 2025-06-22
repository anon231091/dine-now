'use client';

import { useEffect } from 'react';
import { useRestaurantByTableId } from '@/lib/api';
import { useRestaurantStore, useUIStore } from '@/store';
import { Spinner } from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { RestaurantSelection } from '@/components/RestaurantSelection';
import { MenuView } from '@/components/MenuView';
import { Page } from '@/components/Page';

export default function HomePage() {
  const tableId = useSignal(initData.startParam);
  const { currentRestaurant } = useRestaurantStore();
  const { setCurrentPage } = useUIStore();
  
  const { data: restaurantData, isLoading: loadingRestaurant } = useRestaurantByTableId(tableId || '');

  useEffect(() => {
    setCurrentPage('/');
  }, [setCurrentPage]);

  useEffect(() => {
    if (restaurantData?.data?.data) {
      const { restaurant, table } = restaurantData.data.data;
      useRestaurantStore.getState().setRestaurant(restaurant);
      useRestaurantStore.getState().setTable(table);
    }
  }, [restaurantData]);

  // Show loading while initializing
  if (loadingRestaurant) {
    return (
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              Loading Menu...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  // Show QR code scanner when user open the app directly 
  if (!currentRestaurant) {
    return <RestaurantSelection />;
  }

  // Show main menu view
  return <MenuView />;
}
