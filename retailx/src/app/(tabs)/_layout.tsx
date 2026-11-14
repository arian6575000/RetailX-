import React from 'react';
import { Tabs } from 'expo-router';
import { useSession } from '../../ctx/Session';
import { useCan } from '../../license/LicenseGate';
import TabBar from '../../ui/TabBar';

/** Visible tabs: Home, History, centre "+" (sell), Reports, More. The rest are hidden routes opened from Home / More. */
export default function TabsLayout() {
  const { can } = useSession();
  const lic = useCan();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="sell" options={{ href: can('sell') ? undefined : null }} />
      <Tabs.Screen name="reports" options={{ href: can('report.view') ? undefined : null }} />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: can('product.edit') ? undefined : null }} />
      <Tabs.Screen name="customers" options={{ href: lic('customers.manage') ? undefined : null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null }} />
      <Tabs.Screen name="backup" options={{ href: null }} />
    </Tabs>
  );
}
