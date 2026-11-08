import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { useCart } from '../../ctx/Cart';
import { useCan } from '../../license/LicenseGate';
import { C } from '../../lib/theme';

type Icon = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { t } = useApp();
  const { can } = useSession();
  const lic = useCan();
  const { count } = useCart();
  const insets = useSafeAreaInsets();
  const icon = (name: Icon, outline: Icon) => ({ color, focused }: { color: any; focused: boolean }) => <Ionicons name={focused ? name : outline} size={23} color={color} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: C.line, height: 58 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 6), ...(Platform.OS === 'android' ? { elevation: 8 } : {}) },
      }}>
      <Tabs.Screen name="index" options={{ title: t('navRegister'), tabBarIcon: icon('cart', 'cart-outline'), tabBarBadge: count > 0 ? count : undefined, href: can('sell') ? undefined : null }} />
      <Tabs.Screen name="products" options={{ title: t('navProducts'), tabBarIcon: icon('cube', 'cube-outline'), href: can('product.edit') ? undefined : null }} />
      <Tabs.Screen name="customers" options={{ title: t('navCustomers'), tabBarIcon: icon('people', 'people-outline'), href: lic('customers.manage') ? undefined : null }} />
      <Tabs.Screen name="history" options={{ title: t('navHistory'), tabBarIcon: icon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('navMore'), tabBarIcon: icon('ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline') }} />
    </Tabs>
  );
}
