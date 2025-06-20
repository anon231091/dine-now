'use client';

import { 
  List, 
  Card, 
  Caption, 
  Title, 
  Subheadline,
  Spinner,
  Placeholder 
} from '@telegram-apps/telegram-ui';
import { MapPin, Clock, Star } from 'lucide-react';
import { useRestaurants } from '../lib/api';
import { useRestaurantStore, useUIStore } from '../store';
import { useTelegram } from '../providers/TelegramProvider';
import { Restaurant } from '@dine-now/shared';

export function RestaurantSelection() {
  const { data: restaurantsResponse, isLoading, error } = useRestaurants();
  const { setRestaurant } = useRestaurantStore();
  const { language } = useUIStore();
  const { impactHaptic } = useTelegram();

  const restaurants = restaurantsResponse?.data?.data || [];

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    impactHaptic('light');
    setRestaurant(restaurant);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="l" />
          <p className="mt-4 text-[--tg-theme-hint-color]">
            Loading restaurants...
          </p>
        </div>
      </div>
    );
  }

  if (error || restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Placeholder
          header="No Restaurants Available"
          description="We couldn't find any restaurants at the moment. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--tg-theme-bg-color]">
      <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
        <Title level="1" className="text-center text-[--tg-theme-text-color]">
          Choose Restaurant
        </Title>
        <Caption level="1" className="text-center text-[--tg-theme-hint-color] mt-1">
          {language === 'km' ? 'ជ្រើសរើសភោជនីយដ្ឋាន' : 'Select your dining destination'}
        </Caption>
      </div>

      <div className="p-4 space-y-3">
        {restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onSelect={handleSelectRestaurant}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurant: Restaurant) => void;
  language: 'en' | 'km';
}

function RestaurantCard({ restaurant, onSelect, language }: RestaurantCardProps) {
  const getName = () => {
    if (language === 'km' && restaurant.nameKh) {
      return restaurant.nameKh;
    }
    return restaurant.name;
  };

  const getDescription = () => {
    if (language === 'km' && restaurant.descriptionKh) {
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
            <span>15-30 min</span>
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
