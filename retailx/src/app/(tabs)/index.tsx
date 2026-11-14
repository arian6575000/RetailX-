import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActionTile, Card, GradientCard, IconButton, Muted, Row, Screen, SectionLabel, StatCard, T, Grid } from '../../ui/kit';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { useCan } from '../../license/LicenseGate';
import { Repo } from '../../db/repo';
import { useLoad } from '../../lib/hooks';
import { daysAgoMs, endOfDayMs, startOfDayMs } from '../../lib/dates';
import { Fmt } from '../../lib/format';
import { C } from '../../lib/theme';

const compact = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${Math.round(n / 1e3)}K` : String(Math.round(n)));

/** Home dashboard: today's sales, month totals, quick actions. */
export default function Home() {
  const { t, settings } = useApp();
  const { staff, can, logout } = useSession();
  const lic = useCan();
  const full = can('report.view');
  const [d, reload] = useLoad(async () => {
    const now = Date.now(), to = endOfDayMs(now), t0 = startOfDayMs(now);
    const mFrom = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const sid = full ? undefined : staff?.id ?? -1;
    const [today, yest, month, series, exp, customers, products] = await Promise.all([
      Repo.statsForRange(t0, to, sid), Repo.statsForRange(daysAgoMs(1, now), t0 - 1, sid), Repo.statsForRange(mFrom, to, sid),
      Repo.dailySeries(7), full ? Repo.expensesTotal(mFrom, to) : Promise.resolve(0), lic('customers.manage') ? Repo.listCustomers() : Promise.resolve([]),
      can('product.edit') ? Repo.listProducts() : Promise.resolve([]),
    ]);
    const low = products.filter((p) => p.stock != null && p.stock <= settings.lowStockThreshold).length;
    return { today, yest, month, series, exp, customers: customers.length, low };
  }, [full, staff?.id, settings.lowStockThreshold]);

  const delta = d && d.yest.revenue > 0 ? Math.round(((d.today.revenue - d.yest.revenue) / d.yest.revenue) * 100) : undefined;
  const heroContent = (
    <Row gap={12} style={{ justifyContent: 'space-between' }}>
      <Row gap={12} style={{ flex: 1 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="storefront" size={22} color={C.primary} /></View>
        <View style={{ flex: 1 }}>
          <T bold size={18} color="#fff" numberOfLines={1}>{`${t('hello')}, ${staff?.name ?? ''}`}</T>
          <T size={13} color="rgba(255,255,255,0.8)" numberOfLines={1}>{settings.businessName || t('storeFallback')}</T>
        </View>
      </Row>
      <IconButton onDark icon="lock-closed-outline" onPress={logout} />
    </Row>
  );

  return (
    <Screen heroContent={heroContent} onRefresh={reload} padBottom={40}>
      <GradientCard
        style={{ marginTop: 2 }} label={t('todaySales')} value={Fmt.money(d?.today.revenue ?? 0)}
        delta={delta != null ? `${delta >= 0 ? '+' : ''}${delta}% ${t('vsYesterday')}` : undefined} bars={d?.series.map((s) => s.revenue)} />
      {full ? (
        <Grid>
          <StatCard icon="cash" tone="blue" small value={`${Fmt.currency} ${compact(d?.month.revenue ?? 0)}`} label={`${t('totalSales')} · ${t('thisMonth')}`} />
          <StatCard icon="trending-up" tone="green" small value={`${Fmt.currency} ${compact((d?.month.revenue ?? 0) - (d?.exp ?? 0))}`} label={`${t('netProfit')} · ${t('thisMonth')}`} />
          <StatCard icon="receipt" tone="violet" small value={d?.month.count ?? 0} label={`${t('orders')} · ${t('thisMonth')}`} />
          {lic('customers.manage') ? <StatCard icon="people" tone="orange" small value={d?.customers ?? 0} label={t('navCustomers')} /> : null}
        </Grid>
      ) : (
        <Grid><StatCard icon="receipt" tone="violet" small value={d?.today.count ?? 0} label={`${t('orders')} · ${t('today')}`} /><StatCard icon="cash" tone="green" small value={Fmt.money(d?.today.average ?? 0)} label={t('avgSale')} /></Grid>
      )}
      {d && d.low > 0 ? (
        <Card onPress={() => router.push('/products' as any)} style={{ marginTop: 6 }}>
          <Row gap={12}><Ionicons name="alert-circle" size={24} color={C.warning} /><T bold style={{ flex: 1 }}>{t('lowStockItems')}</T><T bold color={C.warning}>{String(d.low)}</T><Ionicons name="chevron-forward" size={18} color={C.faint} /></Row>
        </Card>
      ) : null}
      <SectionLabel>{t('quickActions')}</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {can('sell') ? <ActionTile icon="cart" label={t('sellAction')} onPress={() => router.push('/sell' as any)} /> : null}
        {can('product.edit') ? <ActionTile icon="cube" tone="orange" label={t('navProducts')} onPress={() => router.push('/products' as any)} /> : null}
        {lic('customers.manage') ? <ActionTile icon="people" tone="green" label={t('navCustomers')} onPress={() => router.push('/customers' as any)} /> : null}
        {full ? <ActionTile icon="bar-chart" tone="violet" label={t('reportsTitle')} onPress={() => router.push('/reports' as any)} /> : null}
        {can('expense.manage') ? <ActionTile icon="wallet" tone="red" label={t('expensesTitle')} onPress={() => router.push('/expenses' as any)} /> : null}
      </View>
      <Muted center style={{ marginTop: 18 }}>{t('tagline')}</Muted>
    </Screen>
  );
}
