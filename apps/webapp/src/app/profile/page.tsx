'use client';

import { useState } from 'react';
import {useTranslations} from 'next-intl';
import { 
  Card, 
  Title, 
  Caption, 
  List,
  Cell,
  Avatar,
  Switch,
} from '@telegram-apps/telegram-ui';
import { 
  User, 
  Globe, 
  Bell,
  HelpCircle,
  Info
} from 'lucide-react';
import { useOrdersStore } from '@/store';
import toast from 'react-hot-toast';
import { Page } from '@/components/Page';
import { initData, useSignal } from '@telegram-apps/sdk-react';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default function ProfilePage() {
  const t = useTranslations('ProfilePage');
  const user = useSignal(initData.user);
  const { orderHistory } = useOrdersStore();
  const [notifications, setNotifications] = useState(true);

  const totalOrders = orderHistory.length;
  const totalSpent = orderHistory.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color]">
        {/* Header */}
        <div className="p-4 border-b border-[--tg-theme-separator-color]">
          <Title level="1" className="text-center text-[--tg-theme-text-color]">
            {t('Profile')}
          </Title>
        </div>

        {/* User Info */}
        <Card className="m-4">
          <div className="p-4">
            <div className="flex items-center space-x-4">
              <Avatar 
                size={48}
                fallbackIcon={<User className="w-8 h-8" />}
              />
              <div className="flex-1">
                <Title level="3" className="text-[--tg-theme-text-color]">
                  {user?.first_name} {user?.last_name}
                </Title>
                {user?.username && (
                  <Caption level="1" className="text-[--tg-theme-hint-color]">
                    @{user.username}
                  </Caption>
                )}
                <Caption level="1" className="text-[--tg-theme-hint-color] mt-1">
                  ID: {user?.id}
                </Caption>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around mt-4 pt-4 border-t border-[--tg-theme-separator-color]">
              <div className="text-center">
                <Title level="2" className="text-[--tg-theme-link-color]">
                  {totalOrders}
                </Title>
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {t('Orders')}
                </Caption>
              </div>
              <div className="text-center">
                <Title level="2" className="text-[--tg-theme-link-color]">
                  ${totalSpent.toFixed(2)}
                </Title>
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {t('Total Spent')}
                </Caption>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="m-4">
          <List>
            <Cell
              before={<Globe className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              after={<LocaleSwitcher />}
              Component="div"
            >
              {t('Language')}
            </Cell>

            <Cell
              before={<Bell className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              after={
                <Switch
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
              }
              Component="div"
            >
              {t('Notifications')}
            </Cell>
          </List>
        </Card>

        {/* Quick Actions */}
        <Card className="m-4">
          <List>   
            <Cell
              before={<HelpCircle className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              onClick={() => {
                toast(t('Help coming soon'));
              }}
              Component="button"
            >
              {t('Help & Support')}
            </Cell>

            <Cell
              before={<Info className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              subtitle="Version 1.0.0"
              Component="div"
            >
              {t('About App')}
            </Cell>
          </List>
        </Card>
      </div>
    </Page>
  );
}
