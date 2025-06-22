'use client';

import { 
  Card, 
  Caption, 
  Title, 
  Subheadline,
  Spinner,
  Placeholder 
} from '@telegram-apps/telegram-ui';
import { MapPin, Clock, Star } from 'lucide-react';
import { useRestaurants } from '@/lib/api';
import { useRestaurantStore } from '@/store';
import { Restaurant } from '@dine-now/shared';
import { Page } from './Page';
import { useLocale } from 'next-intl';
import { useTranslations } from 'use-intl';

export function RestaurantSelection() {
  const t = useTranslations('RestaurantSelection');
  const { data: restaurantsResponse, isLoading, error } = useRestaurants();
  const { setRestaurant } = useRestaurantStore();

  const restaurants = restaurantsResponse?.data?.data || [];

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setRestaurant(restaurant);
  };

  if (isLoading) {
    return (
      <Page back={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {t('Loading restaurants')}...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (error || restaurants.length === 0) {
    return (
      <Page back={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('No Restaurants Available')}
            description={t("We couldn't find any restaurants at the moment. Please try again later.")}
          />
        </div>
      </Page>
    );
  }

  return (
    <Page back={false}>
      <div className="min-h-screen bg-[--tg-theme-bg-color]">
        <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
          <Title level="1" className="text-center text-[--tg-theme-text-color]">
          {t('Choose Restaurant')}
          </Title>
          <Caption level="1" className="text-center text-[--tg-theme-hint-color] mt-1">
            {t('Select your dining destination')}
          </Caption>
        </div>

        <div className="p-4 space-y-3">
          {restaurants.map((restaurant: Restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={handleSelectRestaurant}
            />
          ))}
        </div>
      </div>
    </Page>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurant: Restaurant) => void;
}

function RestaurantCard({ restaurant, onSelect }: RestaurantCardProps) {
  const locale = useLocale();
  const t = useTranslations('RestaurantSelection');

  const getName = () => {
    if (locale === 'km' && restaurant.nameKh) {
      return restaurant.nameKh;
    }
    return restaurant.name;
  };

  const getDescription = () => {
    if (locale === 'km' && restaurant.descriptionKh) {
      return restaurant.descriptionKh;
    }
    return restaurant.description;
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-[--tg-theme-secondary-bg-color] transition-colors"
      onClick={() => onSelect(restaurant)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Title level="3" className="text-[--tg-theme-text-color] mb-1">
              {getName()}
            </Title>
            {getDescription() && (
              <Subheadline level="2" className="text-[--tg-theme-hint-color] mb-2">
                {getDescription()}
              </Subheadline>
            )}
          </div>
          <div className="ml-3 flex items-center space-x-1 text-[--tg-theme-link-color]">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">4.8</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
              <MapPin className="w-4 h-4" />
              <span>{restaurant.address}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 text-[--tg-theme-hint-color]">
            <Clock className="w-4 h-4" />
            <span>{t('15-30 min')}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[--tg-theme-separator-color]">
          <div className="flex items-center justify-between">
            <Caption level="1" className="text-[--tg-theme-hint-color]">
              {restaurant.phoneNumber}
            </Caption>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </Card>
  );
}
