'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, Placeholder, Spinner, Title } from '@telegram-apps/telegram-ui';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { AlertCircle, QrCode } from 'lucide-react';

import { useRestaurantByTableId } from '@/lib/api';
import { useRestaurantStore, useUIStore } from '@/store';
import { MenuView } from '@/components/MenuView';
import { Page } from '@/components/Page';

export default function HomePage() {
  const t = useTranslations('HomePage');
  const router = useRouter();
  const startParam = useSignal(initData.startParam);
  const searchParams = useSearchParams();
  const user = useSignal(initData.user);
  const { setRestaurant, setTable, clearRestaurant } = useRestaurantStore();
  const { setCurrentPage } = useUIStore();
  
  const tableId = startParam || searchParams.get('tgWebAppStartParam') || searchParams.get('tableId');
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
      setRestaurant(restaurant);
      setTable(table);
    }
  }, [restaurantData, setRestaurant, setTable]);

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
  }

  // Show QR code scan prompt if no table ID
  if (!tableId) {
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <Title level="2" className="text-[--tg-theme-text-color] mb-2">
              {t('Scan QR Code')}
            </Title>
            
            <p className="text-[--tg-theme-hint-color] mb-4">
              {t('Please scan the QR code on your table to start ordering')}
            </p>
            
            <Button 
              mode="filled" 
              size="l" 
              stretched
              onClick={() => {
                // For development/testing - allow manual table selection
                if (process.env.NODE_ENV === 'development') {
                  router.push('?tableId=demo-table-001');
                }
              }}
            >
              {process.env.NODE_ENV === 'development' ? t('Demo Mode') : t('Scan QR Code')}
            </Button>
          </Card>
        </div>
      </Page>
    );
  }

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

  // Show error if table/restaurant not found
  if (restaurantError || !restaurantData?.data?.data) {
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
                // Clear current data and try again
                clearRestaurant();
                router.push('/');
              }}
            >
              {t('Try Again')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  // Show main menu view if restaurant is selected
  return <MenuView />;
}
