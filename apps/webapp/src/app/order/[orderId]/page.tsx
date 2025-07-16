'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Button,
  Spinner,
  Placeholder,
} from '@telegram-apps/telegram-ui';
import toast from 'react-hot-toast';
import { Clock, MapPin, AlertCircle, Bell, Home } from 'lucide-react';

import { useOrder, useWebSocket } from '@/lib/api';
import { useWebSocketStore } from '@/store';
import { Page } from '@/components/Page';
import { ORDER_STATUS, type OrderDetailsWithInfo, type OrderItem, type OrderStatus } from '@dine-now/shared';
import { getStatusEmoji } from '@/helpers';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{orderId: string}>();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('OrderTrackingPage');
  const format = useFormatter();
  
  const { messages, isConnected } = useWebSocketStore();
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const { data: orderResponse, isLoading, error, refetch } = useOrder(orderId);
  const order = useMemo<OrderDetailsWithInfo>(() => orderResponse?.data?.data, [orderResponse]);
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Handle WebSocket messages for order updates
  useEffect(() => {
    if (!order) return;

    // Set initial status
    if (currentOrderStatus === null) {
      setCurrentOrderStatus(order.status);
    }

    // Listen for order updates
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage?.type === 'order_status_update' && 
      latestMessage.data.orderId === orderId
    ) {
      const newStatus = latestMessage.data.status;
      
      // Only update if status has changed
      if (newStatus !== currentOrderStatus) {
        setCurrentOrderStatus(newStatus);
        setLastUpdateTime(new Date());
        
        // Show status update notification
        toast.success(
          `${t('Status updated')}: ${newStatus}`,
          {
            icon: '🎉',
            duration: 5000,
          }
        );

        // Refetch order data to get latest information
        refetch();
      }
    }
  }, [messages, order, orderId, currentOrderStatus, refetch, t]);

  // Auto-refetch order periodically if not completed
  useEffect(() => {
    if (!order || order.status === 'served' || order.status === 'cancelled') return;

    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [order, refetch]);

  const getItemName = (item: OrderItem) => {
    if (locale === 'km' && item.menuItem.nameKh) {
      return item.menuItem.nameKh;
    }
    return item.menuItem.name || t('Unknown Item');
  };

  const displayStatus = currentOrderStatus || order?.status || t('pending');

  if (isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Spinner size="l" />
            <p className="mt-4 text-[--tg-theme-hint-color]">
              {t('Loading order')}...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (error || !order) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={t('Order Not Found')}
            description={t('This order could not be found')}
          >
            <Button mode="filled" onClick={() => router.push('/')}>
              {t('Go Home')}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  const isOrderComplete = displayStatus === 'served';
  const isOrderReady = displayStatus === 'ready';

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color] p-4 space-y-4">
        {/* WebSocket Connection Status */}
        {!isConnected && (
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <Caption level="1" className="text-yellow-700">
                {t('Connection unstable - Updates may be delayed')}
              </Caption>
            </div>
          </Card>
        )}

        {/* Header */}
        <Card className="p-4">
          <div className="text-center space-y-2">
            <div className="text-4xl mb-2">
              {getStatusEmoji(displayStatus)}
            </div>
            
            <Title level="1" className="text-[--tg-theme-text-color]">
              {displayStatus}
            </Title>
            
            <Caption level="1" className="text-[--tg-theme-hint-color]">
              {t('Order')} #{order.orderNumber}
            </Caption>

            {lastUpdateTime && (
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {t('Updated')} {format.dateTime(lastUpdateTime, 'time')}
              </Caption>
            )}
          </div>

          {/* Restaurant Info */}
          <div className="flex items-center justify-center space-x-3 mt-4 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
            <MapPin className="w-4 h-4 text-[--tg-theme-hint-color]" />
            <div className="text-center">
              <Subheadline level="2" className="text-[--tg-theme-text-color]">
                {order.restaurant.name}
              </Subheadline>
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {t('Table')} {order.table.number}
              </Caption>
            </div>
          </div>
        </Card>

        {/* Status Message */}
        {isOrderReady && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-center">
              <Bell className="w-8 h-8 text-green-600 mx-auto mb-2 animate-bounce" />
              <Title level="3" className="text-green-700 mb-1">
                {t('Your order is ready!')}
              </Title>
              <Caption level="1" className="text-green-600">
                {t('Please wait for our staff to serve your food')}
              </Caption>
            </div>
          </Card>
        )}

        {/* Estimated Time */}
        {(displayStatus === 'confirmed' || displayStatus === 'preparing') && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div className="text-center">
                <Title level="3" className="text-blue-700">
                  ~{order.estimatedPreparationMinutes} {t('minutes')}
                </Title>
                <Caption level="1" className="text-blue-600">
                  {t('Estimated preparation time')}
                </Caption>
              </div>
            </div>
          </Card>
        )}

        {/* Order Status Timeline */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4 text-center">
            {t('Order Progress')}
          </Title>
          
          <div className="space-y-3">
            <OrderStatusStep
              status="pending"
              currentStatus={displayStatus}
              title={t('Order Received')}
              time={order.createdAt}
              isActive={displayStatus === 'pending'}
            />
            <OrderStatusStep
              status="confirmed"
              currentStatus={displayStatus}
              title={t('Kitchen Confirmed')}
              time={order.confirmedAt}
              isActive={displayStatus === 'confirmed'}
            />
            <OrderStatusStep
              status="preparing"
              currentStatus={displayStatus}
              title={t('Cooking Your Food')}
              time={displayStatus === 'preparing' ? new Date() : undefined}
              isActive={displayStatus === 'preparing'}
            />
            <OrderStatusStep
              status="ready"
              currentStatus={displayStatus}
              title={t('Ready for Serve')}
              time={order.readyAt}
              isActive={displayStatus === 'ready'}
            />
            <OrderStatusStep
              status="served"
              currentStatus={displayStatus}
              title={t('Enjoy Your Meal!')}
              time={order.servedAt}
              isActive={false}
            />
          </div>
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4">
            {t('Your order')}
          </Title>
          
          <div className="space-y-2">
            {order.orderItems.map((item: OrderItem, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-[--tg-theme-separator-color] last:border-b-0">
                <div className="flex-1">
                  <Subheadline level="2" className="text-[--tg-theme-text-color]">
                    {item.quantity}x {getItemName(item)}
                  </Subheadline>
                </div>
                <Caption level="1" className="text-[--tg-theme-text-color] font-medium">
                  {format.number(item.subtotal, 'currency')}
                </Caption>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
              <Caption level="1" className="text-[--tg-theme-hint-color] mb-1">
                {t('Special Instructions:')}
              </Caption>
              <Subheadline level="2" className="text-[--tg-theme-text-color]">
                {order.notes}
              </Subheadline>
            </div>
          )}

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-[--tg-theme-separator-color]">
            <div className="flex items-center justify-between">
              <Title level="3" className="text-[--tg-theme-text-color]">
                {t('Total')}
              </Title>
              <Title level="2" className="text-[--tg-theme-link-color]">
                {format.number(order.totalAmount, 'currency')}
              </Title>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="pb-4">
          {isOrderComplete ? (
            <Button
              mode="filled"
              size="l"
              stretched
              onClick={() => router.push('/')}
            >
              <Home className="w-5 h-5 mr-2" />
              {t('Order Again')}
            </Button>
          ) : (
            <Button
              mode="outline"
              size="l"
              stretched
              onClick={() => router.push('/')}
            >
              {t('Back to Menu')}
            </Button>
          )}
        </div>
      </div>
    </Page>
  );
}

// Order Status Step Component
interface OrderStatusStepProps {
  status: OrderStatus;
  currentStatus: OrderStatus;
  title: string;
  time?: Date;
  isActive: boolean;
}

function OrderStatusStep({ status, currentStatus, title, time, isActive }: OrderStatusStepProps) {
  const format = useFormatter();
  const statusIndex = ORDER_STATUS.indexOf(status);
  const currentIndex = ORDER_STATUS.indexOf(currentStatus);
  
  const isCompleted = statusIndex <= currentIndex;
  const isCurrent = statusIndex === currentIndex;
  
  return (
    <div className={`flex items-center space-x-3 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`w-4 h-4 rounded-full ${
        isCompleted ? 'bg-green-500' : 'bg-gray-300'
      } ${isCurrent ? 'ring-2 ring-green-300' : ''} ${isActive ? 'animate-pulse' : ''} flex-shrink-0`} />
      
      <div className="flex-1 flex items-center justify-between">
        <Subheadline level="2" className={`${
          isCompleted ? 'text-[--tg-theme-text-color]' : 'text-[--tg-theme-hint-color]'
        } ${isActive ? 'font-bold' : ''}`}>
          {title}
        </Subheadline>
        {time && isCompleted && (
          <Caption level="1" className="text-[--tg-theme-hint-color]">
            {format.dateTime(time, 'time')}
          </Caption>
        )}
      </div>
    </div>
  );
}
