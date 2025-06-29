import axios, { AxiosInstance } from 'axios';
import { Order, OrderStatus } from '@dine-now/shared';
import config from '../config';
import { logError, logWarning } from '../utils/logger';

export class BotNotificationService {
  private botApi: AxiosInstance;

  constructor() {
    this.botApi = axios.create({
      baseURL: config.telegramWebhookUrl,
      headers: {
        'X-Bot-Secret': config.telegramWebhookSecret
      }
    });
  }

  async notifyNewOrder(order: Order, restaurantId: string) {
    try {
      await this.botApi.post('/notify', {
        type: 'new_order',
        restaurantId,
        data: order
      });
    } catch (error) {
      // Log but don't fail the main operation
      logError(error as Error, { restaurantId, orderId: order.id });
      logWarning('Failed to notify bot about new order');
    }
  }

  async notifyStatusUpdate(orderId: string, status: OrderStatus, restaurantId: string) {
    try {
      await this.botApi.post('/notify', {
        type: 'status_update',
        restaurantId,
        data: { orderId, status }
      });
    } catch (error) {
      logError(error as Error, { restaurantId, orderId });
      logWarning('Failed to notify bot about order status update');
    }
  }
}
//
// // Use in order routes
// const botNotifier = new BotNotificationService();
//
// // In create order handler
// botNotifier.notifyNewOrder(completeOrder, restaurantId);
//
// // In update status handler
// botNotifier.notifyStatusUpdate(orderId, status, currentOrder.order.restaurantId);
