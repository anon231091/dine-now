'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, Placeholder, Spinner, Title } from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { AlertCircle } from 'lucide-react';

import { useRestaurantByTableId } from '@/lib/api';
import { useRestaurantStore, useUIStore } from '@/store';
import { RestaurantSelection } from '@/components/RestaurantSelection';
import { MenuView } from '@/components/MenuView';
import { Page } from '@/components/Page';

export default function HomePage() {
  const t = useTranslations('HomePage');
  const router = useRouter();
  const tableId = useSignal(initData.startParam);
  const user = useSignal(initData.user);
  const { currentRestaurant } = useRestaurantStore();
  const { setCurrentPage } = useUIStore();
  
  const { 
    data: restaurantData, 
    isLoading: loadingRestaurant,
    error: restaurantError 
  } = useRestaurantByTableId(tableId || '');

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

  // Show authentication error
  if (!user) {
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <Title level="2" className="text-[--tg-theme-text-color] mb-2">
              {t('Authentication Required')}
            </Title>
            
            <p className="text-[--tg-theme-hint-color] mb-4">
              {t('Please make sure you opened this app through Telegram')}
            </p>
          </Card>
        </div>
      </Page>
    );
  } else if (loadingRestaurant) {
    // Show loading while authenticating or loading restaurant data
    return (
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {t('Loading Menu')}...
            </p>
          </div>
        </div>
      </Page>
    );
  } else if (restaurantError) {
    // Show restaurant error
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('Table Not Found')}
            description={t('The QR code you scanned is invalid or the table is not available')}
          >
            <Button 
              mode="filled" 
              onClick={() => {
                useRestaurantStore.getState().clearRestaurant();
                router.refresh();
              }}
            >
              {t('Start Over')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  } else if (currentRestaurant) {
    // Show main menu view if restaurant is selected
    return <MenuView />;
  } else {
    // Fallback to restaurant selection
    return <RestaurantSelection />;
  }
}
