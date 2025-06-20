'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Title, 
  Subheadline, 
  Caption, 
  Button,
  List,
  Cell,
  Avatar,
  Switch,
  Modal,
  Placeholder
} from '@telegram-apps/telegram-ui';
import { 
  User, 
  Phone, 
  Globe, 
  LogOut, 
  ShoppingBag, 
  Bell,
  HelpCircle,
  Info
} from 'lucide-react';
import { useAuthStore, useUIStore, useOrdersStore } from '@/store';
import { LanguageSwitcher } from '@/components/Navigation';
import toast from 'react-hot-toast';
import { Page } from '@/components/Page';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { language, setLanguage } = useUIStore();
  const { orderHistory } = useOrdersStore();
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    toast.success(language === 'km' ? 'អ្នកបានចាកចេញដោយជោគជ័យ' : 'Logged out successfully');
    router.push('/');
  };

  const handleNotificationToggle = (checked: boolean) => {
    setNotifications(checked);
    toast.success(
      checked 
        ? (language === 'km' ? 'បើកការជូនដំណឹង' : 'Notifications enabled')
        : (language === 'km' ? 'បិទការជូនដំណឹង' : 'Notifications disabled')
    );
  };

  const totalOrders = orderHistory.length;
  const totalSpent = orderHistory.reduce((sum, order) => sum + order.totalAmount, 0);

  if (!user) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Placeholder
            header={language === 'km' ? 'មិនបានចូល' : 'Not Logged In'}
            description={language === 'km' ? 'សូមចូលដើម្បីមើលប្រវត្តិរូបរបស់អ្នក' : 'Please login to view your profile'}
          >
            <Button mode="filled" onClick={() => router.push('/')}>
              {language === 'km' ? 'ចូល' : 'Login'}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen bg-[--tg-theme-bg-color]">
        {/* Header */}
        <div className="p-4 border-b border-[--tg-theme-separator-color]">
          <Title level="1" className="text-center text-[--tg-theme-text-color]">
            {language === 'km' ? 'ប្រវត្តិរូប' : 'Profile'}
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
                  {user.firstName} {user.lastName}
                </Title>
                {user.username && (
                  <Caption level="1" className="text-[--tg-theme-hint-color]">
                    @{user.username}
                  </Caption>
                )}
                <Caption level="1" className="text-[--tg-theme-hint-color] mt-1">
                  {language === 'km' ? 'អតិថិជន' : 'Customer'} • ID: {user.telegramId}
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
                  {language === 'km' ? 'ការបញ្ជាទិញ' : 'Orders'}
                </Caption>
              </div>
              <div className="text-center">
                <Title level="2" className="text-[--tg-theme-link-color]">
                  ${totalSpent.toFixed(2)}
                </Title>
                <Caption level="1" className="text-[--tg-theme-hint-color]">
                  {language === 'km' ? 'ចំណាយសរុប' : 'Total Spent'}
                </Caption>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="m-4">
          <List>
            <Cell
              before={<Phone className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              subtitle={user.phoneNumber || (language === 'km' ? 'មិនបានផ្តល់' : 'Not provided')}
              Component="div"
            >
              {language === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
            </Cell>

            <Cell
              before={<Globe className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              after={<LanguageSwitcher />}
              Component="div"
            >
              {language === 'km' ? 'ភាសា' : 'Language'}
            </Cell>

            <Cell
              before={<Bell className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              after={
                <Switch
                  checked={notifications}
                  onChange={(e) => handleNotificationToggle(e.target.checked)}
                />
              }
              Component="div"
            >
              {language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'}
            </Cell>
          </List>
        </Card>

        {/* Quick Actions */}
        <Card className="m-4">
          <List>
            <Cell
              before={<ShoppingBag className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              onClick={() => {
                router.push('/orders');
              }}
              Component="button"
            >
              {language === 'km' ? 'ប្រវត្តិការបញ្ជាទិញ' : 'Order History'}
            </Cell>

            <Cell
              before={<HelpCircle className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              onClick={() => {
                toast(language === 'km' ? 'ជំនួយនឹងមកឆាប់ៗនេះ' : 'Help coming soon');
              }}
              Component="button"
            >
              {language === 'km' ? 'ជំនួយ និងគាំទ្រ' : 'Help & Support'}
            </Cell>

            <Cell
              before={<Info className="w-5 h-5 text-[--tg-theme-hint-color]" />}
              subtitle="Version 1.0.0"
              Component="div"
            >
              {language === 'km' ? 'អំពីកម្មវិធី' : 'About App'}
            </Cell>
          </List>
        </Card>

        {/* Logout Button */}
        <div className="p-4">
          <Button
            mode="outline"
            size="l"
            stretched
            onClick={handleLogout}
            className="text-[--tg-theme-destructive-text-color] border-[--tg-theme-destructive-text-color]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'km' ? 'ចាកចេញ' : 'Logout'}
          </Button>
        </div>

        {/* Logout Confirmation Modal */}
        <Modal
          open={showLogoutModal}
          onOpenChange={setShowLogoutModal}
        >
          <div className="p-6 text-center">
            <Title level="3" className="text-[--tg-theme-text-color] mb-4">
              {language === 'km' ? 'បញ្ជាក់ការចាកចេញ' : 'Confirm Logout'}
            </Title>
            <Subheadline level="2" className="text-[--tg-theme-hint-color] mb-6">
              {language === 'km' 
                ? 'តើអ្នកប្រាកដថាចង់ចាកចេញមែនទេ?' 
                : 'Are you sure you want to logout?'}
            </Subheadline>
            
            <div className="flex space-x-3">
              <Button
                mode="outline"
                size="l"
                stretched
                onClick={() => setShowLogoutModal(false)}
              >
                {language === 'km' ? 'បោះបង់' : 'Cancel'}
              </Button>
              <Button
                mode="filled"
                size="l"
                stretched
                onClick={confirmLogout}
                className="bg-[--tg-theme-destructive-text-color]"
              >
                {language === 'km' ? 'ចាកចេញ' : 'Logout'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Page>
  );
}
