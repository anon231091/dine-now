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
  Badge,
  Spinner,
  Placeholder,
} from '@telegram-apps/telegram-ui';
import toast from 'react-hot-toast';
import { Clock, MapPin, CheckCircle, AlertCircle, Bell } from 'lucide-react';

import { useOrder, useWebSocket } from '@/lib/api';
import { useWebSocketStore } from '@/store';
import { Page } from '@/components/Page';
import { Currency, getOrderStatusText, Order, OrderItem, type OrderStatus } from '@dine-now/shared';

export default function OrderTrackingPage() {
  const { orderId } = useParams<{orderId: string}>();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('OrderTrackingPage');
  const format = useFormatter();
  
  const { messages, isConnected } = useWebSocketStore();
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatus | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const { data: orderResponse, isLoading, error, refetch } = useOrder(orderId);
  const order = useMemo<Order>(() => orderResponse?.data?.data, [orderResponse]);
  
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
        setShowStatusUpdate(true);
        
        // Show status update notification
        const statusText = getOrderStatusText(newStatus);
        toast.success(
          `${t('Status updated')}: ${statusText}`,
          {
            icon: '🎉',
            duration: 5000,
          }
        );

        // Refetch order data to get latest information
        refetch();

        // Hide status update banner after 5 seconds
        setTimeout(() => setShowStatusUpdate(false), 5000);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'confirmed': return 'text-blue-600';
      case 'preparing': return 'text-orange-600';
      case 'ready': return 'text-green-600';
      case 'served': return 'text-green-700';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'preparing': return <Clock className="w-5 h-5 animate-pulse" />;
      case 'ready': return <Bell className="w-5 h-5 animate-bounce" />;
      case 'served': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <AlertCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getItemName = (item: OrderItem) => {
    if (locale === 'km' && item.menuItem?.nameKh) {
      return item.menuItem.nameKh;
    }
    return item.menuItem?.name || t('Unknown Item');
  };

  const formatPrice = (amount: number, currency: Currency) => format.number(amount, {
    style: 'currency',
    currency
  });

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

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color] p-4 space-y-4">
        {/* Status Update Banner */}
        {showStatusUpdate && (
          <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-3 z-50 animate-slide-down">
            <div className="flex items-center justify-center space-x-2">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="font-medium">
                {t('Status Updated')}!
              </span>
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-3">
            <div>
              <Title level="2" className="text-[--tg-theme-text-color]">
                {t('Order')} #{order.orderNumber}
              </Title>
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {format.dateTime(order.createdAt, 'time')}
                {lastUpdateTime && (
                  <span className="ml-2">
                    • {t('Updated')} {format.dateTime(lastUpdateTime, 'time')}
                  </span>
                )}
              </Caption>
            </div>
            <Badge 
              type='dot'
              mode={displayStatus === 'served' ? 'primary' : 'secondary'}
              className={`${getStatusColor(displayStatus)} flex items-center space-x-1`}
            >
              {getStatusIcon(displayStatus)}
              <span>{getOrderStatusText(displayStatus)}</span>
            </Badge>
          </div>

          {/* Restaurant Info */}
          <div className="flex items-center space-x-3 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
            <MapPin className="w-5 h-5 text-[--tg-theme-hint-color]" />
            <div>
              <Subheadline level="2" className="text-[--tg-theme-text-color]">
                {order.restaurant?.name}
              </Subheadline>
              <Caption level="1" className="text-[--tg-theme-hint-color]">
                {t('Table')} {order.table?.number}
              </Caption>
            </div>
          </div>
        </Card>

        {/* Order Status Timeline */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4">
            {t('Order Status')}
          </Title>
          
          <div className="space-y-4">
            <OrderStatusStep
              status="pending"
              currentStatus={displayStatus}
              title={t('Order Received')}
              time={order.createdAt}
            />
            <OrderStatusStep
              status="confirmed"
              currentStatus={displayStatus}
              title={t('Order Confirmed')}
              time={order.confirmedAt}
            />
            <OrderStatusStep
              status="preparing"
              currentStatus={displayStatus}
              title={t('Preparing')}
              time={displayStatus === 'preparing' ? new Date() : undefined}
              isActive={displayStatus === 'preparing'}
            />
            <OrderStatusStep
              status="ready"
              currentStatus={displayStatus}
              title={t('Ready for Pickup')}
              time={order.readyAt}
              isActive={displayStatus === 'ready'}
            />
            <OrderStatusStep
              status="served"
              currentStatus={displayStatus}
              title={t('Served')}
              time={order.servedAt}
            />
          </div>

          {/* Estimated Time */}
          {(displayStatus === 'confirmed' || displayStatus === 'preparing') && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <Caption level="1" className="text-blue-700">
                  {`${t('Estimated time')}: ${order.estimatedPreparationMinutes} ${t('more minutes')}`}
                </Caption>
              </div>
            </div>
          )}

          {/* Ready Notification */}
          {displayStatus === 'ready' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg animate-pulse">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-green-600 animate-bounce" />
                <Caption level="1" className="text-green-700 font-medium">
                  {t('Your order is ready! Please wait for service.')}
                </Caption>
              </div>
            </div>
          )}
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <Title level="3" className="text-[--tg-theme-text-color] mb-4">
            {t('Order Items')}
          </Title>
          
          <div className="space-y-3">
            {order.orderItems?.map((item: OrderItem, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-[--tg-theme-separator-color] last:border-b-0">
                <div className="flex-1">
                  <Subheadline level="2" className="text-[--tg-theme-text-color]">
                    {item.quantity}x {getItemName(item)}
                  </Subheadline>
                  {item.notes && (
                    <Caption level="1" className="text-[--tg-theme-hint-color] italic">
                      {item.notes}
                    </Caption>
                  )}
                </div>
                <Caption level="1" className="text-[--tg-theme-text-color] font-medium">
                  {formatPrice(item.subtotal, order.currency)}
                </Caption>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-[--tg-theme-secondary-bg-color] rounded-lg">
              <Caption level="1" className="text-[--tg-theme-hint-color] mb-1">
                {t('Order Notes:')}
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
                {formatPrice(order.totalAmount, order.currency)}
              </Title>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        {displayStatus !== 'served' && displayStatus !== 'cancelled' && (
          <div className="space-y-3">
            <Button
              mode="outline"
              size="l"
              stretched
              onClick={() => router.push('/')}
            >
              {t('Order More')}
            </Button>
          </div>
        )}
      </div>
    </Page>
  );
}

// Order Status Step Component
interface OrderStatusStepProps {
  status: string;
  currentStatus: string;
  title: string;
  time?: Date;
  isActive?: boolean;
}

function OrderStatusStep({ status, currentStatus, title, time, isActive }: OrderStatusStepProps) {
  const format = useFormatter();
  const statusIndex = ['pending', 'confirmed', 'preparing', 'ready', 'served'].indexOf(status);
  const currentIndex = ['pending', 'confirmed', 'preparing', 'ready', 'served'].indexOf(currentStatus);
  
  const isCompleted = statusIndex <= currentIndex;
  const isCurrent = statusIndex === currentIndex;
  
  return (
    <div className={`flex items-center space-x-3 ${isCompleted ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`w-3 h-3 rounded-full ${
        isCompleted ? 'bg-green-500' : 'bg-gray-300'
      } ${isCurrent ? 'ring-2 ring-green-300' : ''} ${isActive ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1">
        <Subheadline level="2" className={`${
          isCompleted ? 'text-[--tg-theme-text-color]' : 'text-[--tg-theme-hint-color]'
        } ${isActive ? 'font-bold' : ''}`}>
          {title}
        </Subheadline>
        {time && isCompleted && (
          <Caption level="1" className="text-[--tg-theme-hint-color]">{format.dateTime(time, 'time')}</Caption>
        )}
      </div>
    </div>
  );
}
