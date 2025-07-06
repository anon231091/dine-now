import axios, { AxiosInstance } from 'axios';
import { OrderStatus } from '@dine-now/shared';
import config from '../config';
import { logError, logWarning, logInfo } from '../utils/logger';

export class BotNotificationService {
  private botApi: AxiosInstance;

  constructor() {
    this.botApi = axios.create({
      baseURL: config.telegramWebhookUrl,
      headers: {
        'Authorization': `Bearer ${config.telegramBotServiceToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
  }

  async notifyNewOrder(order: any, restaurantId: string) {
    try {
      logInfo('Sending new order notification to bot', { 
        orderId: order.id, 
        restaurantId 
      });

      const response = await this.botApi.post('/notify', {
        type: 'new_order',
        restaurantId,
        data: order,
      });

      logInfo('Bot notification sent successfully', { 
        orderId: order.id,
        response: response.data 
      });
    } catch (error) {
      // Log but don't fail the main operation
      logError(error as Error, { 
        restaurantId, 
        orderId: order.id,
        type: 'new_order_notification' 
      });
      logWarning('Failed to notify bot about new order');
    }
  }

  async notifyStatusUpdate(
    orderId: string, 
    status: OrderStatus, 
    restaurantId: string,
    updatedBy?: string
  ) {
    try {
      logInfo('Sending order status update to bot', { 
        orderId, 
        status, 
        restaurantId 
      });

      const response = await this.botApi.post('/notify', {
        type: 'status_update',
        restaurantId,
        data: { 
          orderId, 
          status,
          updatedBy,
          timestamp: new Date().toISOString()
        }
      });

      logInfo('Bot status update sent successfully', { 
        orderId,
        status,
        response: response.data 
      });
    } catch (error) {
      logError(error as Error, { 
        restaurantId, 
        orderId,
        status,
        type: 'status_update_notification' 
      });
      logWarning('Failed to notify bot about order status update');
    }
  }

  async notifyKitchenLoadUpdate(
    restaurantId: string,
    kitchenLoad: {
      currentOrders: number;
      averagePreparationTime: number;
      estimatedWaitTime?: number;
    }
  ) {
    try {
      logInfo('Sending kitchen load update to bot', { 
        restaurantId, 
        kitchenLoad 
      });

      const response = await this.botApi.post('/notify', {
        type: 'kitchen_load_update',
        restaurantId,
        data: kitchenLoad
      });

      logInfo('Bot kitchen load update sent successfully', { 
        restaurantId,
        response: response.data 
      });
    } catch (error) {
      logError(error as Error, { 
        restaurantId,
        type: 'kitchen_load_notification' 
      });
      logWarning('Failed to notify bot about kitchen load update');
    }
  }

  // Helper method to verify bot service is accessible
  async verifyConnection(): Promise<boolean> {
    try {
      const response = await this.botApi.get('/health');
      return response.status === 200;
    } catch (error) {
      logError(error as Error, { type: 'bot_connection_verification' });
      return false;
    }
  }
}

// Singleton instance
let botNotifierInstance: BotNotificationService | null = null;

export const getBotNotifier = (): BotNotificationService => {
  if (!botNotifierInstance) {
    botNotifierInstance = new BotNotificationService();
  }
  return botNotifierInstance;
};
