import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../ctx/AppContext';
import { useCart } from '../ctx/Cart';
import { useSession } from '../ctx/Session';
import { C, GRAD } from '../lib/theme';
import { T } from './kit';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
interface Props { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (routeKey: string) => void; insets: { bottom: number } }

// Routes that are not in the bar (reached from Home / More) keep their parent tab highlighted.
const PARENT: Record<string, string> = { sell: 'sell', cart: 'sell', products: 'index', customers: 'index', expenses: 'settings', staff: 'settings', backup: 'settings' };

/** Home · History · (+ Sell) · Reports · More — the centre button opens the product grid. */
export default function TabBar({ state, navigateToTab, insets }: Props) {
  const { t } = useApp();
  const { can } = useSession();
  const { count } = useCart();
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const focused = state.routes[state.index]?.name;
  if (kb || focused === 'cart') return null;
  const active = PARENT[focused] ?? focused;
  const go = (name: string) => { const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); };

  const item = (name: string, label: string, on: Icon, off: Icon, show = true) => {
    if (!show) return <View key={name} style={{ flex: 1 }} />;
    const isOn = active === name;
    return (
      <Pressable key={name} onPress={() => go(name)} style={styles.item} android_ripple={{ color: C.tint, borderless: true }}>
        <Ionicons name={isOn ? on : off} size={23} color={isOn ? C.primary : C.faint} />
        <T size={10.5} bold={isOn} color={isOn ? C.primary : C.faint} center numberOfLines={1}>{label}</T>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {item('index', t('navHome'), 'home', 'home-outline')}
      {item('history', t('navHistory'), 'time', 'time-outline')}
      <View style={styles.centerSlot}>
        {can('sell') ? (
          <Pressable onPress={() => go('sell')} accessibilityLabel={t('navRegister')} style={styles.fabWrap}>
            <LinearGradient colors={GRAD.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
              <Ionicons name="add" size={32} color="#fff" />
            </LinearGradient>
            {count > 0 ? <View style={styles.badge}><T size={10.5} bold color="#fff" center>{String(count > 99 ? '99+' : count)}</T></View> : null}
          </Pressable>
        ) : null}
      </View>
      {item('reports', t('reportsTitle'), 'bar-chart', 'bar-chart-outline', can('report.view'))}
      {item('settings', t('navMore'), 'ellipsis-horizontal-circle', 'ellipsis-horizontal-circle-outline')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingTop: 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.line, shadowColor: '#2A1A78', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  centerSlot: { flex: 1, alignItems: 'center' },
  fabWrap: { marginTop: -30 },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', shadowColor: '#5B2BE0', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
});
