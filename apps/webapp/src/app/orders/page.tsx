'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Button,
  Badge,
  Spinner,
  Placeholder,
} from '@telegram-apps/telegram-ui';
import { Clock, MapPin, Receipt, ArrowRight } from 'lucide-react';
import { useOrderHistory } from '../../lib/api';
import { Currency, getOrderStatusText, Order, Restaurant } from '@dine-now/shared';
import { Page } from '@/components/Page';

export default function OrderHistoryPage() {
  const router = useRouter();
  const format = useFormatter();
  const t = useTranslations('OrderHistoryPage');
  
  const [page, setPage] = useState(1);
  const { data: ordersResponse, isLoading, error } = useOrderHistory({ page, limit: 10 });
  const orders = ordersResponse?.data?.data || [];

  const handleOrderClick = (orderId: string) => {
    router.push(`/order/${orderId}`);
  };

  const formatDatetime = (dateTime: Date) => format.dateTime(dateTime, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })

  const formatCurrency = (amount: number, currency: Currency) => format.number(amount, {
    style: 'currency',
    currency,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'primary';
      case 'preparing': return 'warning';
      case 'ready': return 'primary';
      case 'served': return 'primary';
      case 'cancelled': return 'critical';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {t('Loading order history')}...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('Something went wrong')}
            description={t('Unable to load order history')}
          >
            <Button mode="filled" onClick={() => router.refresh()}>
              {t('Try Again')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  if (orders.length === 0) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('No Orders Yet')}
            description={t("You haven't placed any orders yet")}
          >
            <Receipt className="w-12 h-12 text-[--tg-theme-hint-color]" />
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color]">
        {/* Header */}
        <div className="sticky top-0 bg-[--tg-theme-bg-color] border-b border-[--tg-theme-separator-color] p-4 z-10">
          <Title level="1" className="text-center text-[--tg-theme-text-color]">
            {t('Order History')}
          </Title>
        </div>

        {/* Orders List */}
        <div className="p-4 space-y-3">
          {orders.map((order: any) => (
            <OrderCard
              key={order.order.id}
              order={order}
              onOrderClick={handleOrderClick}
              formatDatetime={formatDatetime}
              formatCurrency={formatCurrency}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>

        {/* Load More Button */}
        {orders.length >= 10 && (
          <div className="p-4">
            <Button
              mode="outline"
              size="l"
              stretched
              onClick={() => setPage(page + 1)}
            >
              {t('Load More')}
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}

// Order Card Component
interface OrderCardProps {
  order: { order: Order, restaurant: Restaurant };
  onOrderClick: (orderId: string) => void;
  formatDatetime: (datetime: Date) => string;
  formatCurrency: (amount: number, currency: Currency) => string;
  getStatusColor: (status: string) => string;
}

function OrderCard({ 
  order: { order, restaurant }, 
  onOrderClick, 
  formatDatetime,
  formatCurrency,
  getStatusColor 
}: OrderCardProps) {
  const t = useTranslations('OrderHistoryPage');

  return (
    <Card 
      className="cursor-pointer hover:bg-[--tg-theme-secondary-bg-color] transition-colors"
      onClick={() => onOrderClick(order.id)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Title level="3" className="text-[--tg-theme-text-color]">
                #{order.orderNumber}
              </Title>
              <Badge type='dot' mode={getStatusColor(order.status) as any}>
                {getOrderStatusText(order.status)}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-[--tg-theme-hint-color]" />
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {formatDatetime(order.createdAt)}
                </Caption>
              </div>
            </div>
          </div>
          
          <ArrowRight className="w-5 h-5 text-[--tg-theme-hint-color]" />
        </div>

        {/* Restaurant Info */}
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="w-4 h-4 text-[--tg-theme-hint-color]" />
          <Subheadline level="2" className="text-[--tg-theme-text-color]">
            {restaurant.name}
          </Subheadline>
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            • {t('Table Number')} {order.table?.number}
          </Caption>
        </div>

        {/* Order Summary */}
        <div className="flex items-center justify-between">
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {order.orderItems.length} {t('items')}
          </Caption>
          <Title level="3" className="text-[--tg-theme-link-color]">
            {formatCurrency(order.totalAmount, order.currency)}
          </Title>
        </div>
      </div>
    </Card>
  );
}
