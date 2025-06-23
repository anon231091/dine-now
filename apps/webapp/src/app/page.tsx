'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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
  const [authError, setAuthError] = useState<string | null>(null);
  
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

  // Handle authentication errors
  useEffect(() => {
    if (!user) {
      setAuthError(t('Authentication failed. Please make sure you opened this app through Telegram.'));
    }
  }, [user, t]);

  // Show loading while authenticating or loading restaurant data
  if (loadingRestaurant) {
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
  }

  // Show authentication error
  if (authError) {
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
              {t('Please open this app through Telegram to continue.')}
            </p>
            
            <Button
              mode="filled"
              size="l"
              stretched
              onClick={() => router.reload()}
            >
              {t('Retry')}
            </Button>
          </Card>
        </div>
      </Page>
    );
  }

  // Show restaurant error
  if (restaurantError && tableId) {
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header="Table Not Found"
            description="The QR code you scanned is invalid or the table is not available."
          >
            <Button 
              mode="filled" 
              onClick={() => {
                useRestaurantStore.getState().clearRestaurant();
                router.reload();
              }}
            >
              {t('Start Over')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  // Show restaurant selection when no QR code scanned or restaurant not found
  if (!currentRestaurant && !tableId) {
    return <RestaurantSelection />;
  }

  // Show loading if we have a table ID but restaurant data is still loading
  if (tableId && !currentRestaurant && !restaurantError) {
    return (
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {t('Loading restaurant information')}...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  // Show main menu view if restaurant is selected
  if (currentRestaurant) {
    return <MenuView />;
  }

  // Fallback to restaurant selection
  return <RestaurantSelection />;
}
