import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chips, Grid, Muted, Row, Screen, SectionLabel, StatCard, T } from '../ui/kit';
import { useApp } from '../ctx/AppContext';
import { useSession } from '../ctx/Session';
import { Repo } from '../db/repo';
import { useLoad } from '../lib/hooks';
import { startOfDayMs, endOfDayMs, daysAgoMs } from '../lib/dates';
import { Fmt } from '../lib/format';
import { escapeHtml as h, pageHtml, sharePdf } from '../lib/print';
import { C } from '../lib/theme';

type Range = 'today' | '7' | '30';

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <Row style={{ justifyContent: 'space-between' }}><T size={13} numberOfLines={1} style={{ flex: 1 }}>{r.label}</T><T size={13} bold>{Fmt.money(r.value)}</T></Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(10,108,255,0.10)', marginTop: 3 }}>
            <View style={{ height: 8, borderRadius: 4, width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: C.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Reports() {
  const { t, settings, toast } = useApp();
  const { can } = useSession();
  const [range, setRange] = useState<Range>('7');
  const [d, reload] = useLoad(async () => {
    const from = range === 'today' ? startOfDayMs() : range === '7' ? daysAgoMs(6) : daysAgoMs(29), to = endOfDayMs();
    const [stats, top, cats, series, exp] = await Promise.all([Repo.statsForRange(from, to), Repo.topProducts(from, to, 6), Repo.categoryBreakdown(from, to), Repo.dailySeries(7), Repo.expensesTotal(from, to)]);
    return { stats, top, cats, series, exp };
  }, [range]);
  if (!can('report.view')) return <Screen back title={t('reportsTitle')}><Muted center style={{ marginTop: 40 }}>{t('adminOnly')}</Muted></Screen>;

  const pdf = async () => {
    if (!d) return;
    const rows = (a: { name: string; v: number }[]) => a.map((r) => `<div class="r"><span>${h(r.name)}</span><span>${h(Fmt.money(r.v))}</span></div>`).join('');
    const body = [
      `<div class="c b" style="font-size:1.3em">${h(settings.businessName)} — ${h(t('reportsTitle'))}</div><hr/>`,
      `<div class="r"><span>${h(t('revenue'))}</span><span>${h(Fmt.money(d.stats.revenue))}</span></div>`,
      `<div class="r"><span>${h(t('sales'))}</span><span>${d.stats.count}</span></div>`,
      `<div class="r"><span>${h(t('discounts'))}</span><span>${h(Fmt.money(d.stats.discounts))}</span></div>`,
      `<div class="r"><span>${h(t('taxCollected'))}</span><span>${h(Fmt.money(d.stats.tax))}</span></div>`,
      `<div class="r"><span>${h(t('expenses'))}</span><span>${h(Fmt.money(d.exp))}</span></div>`,
      `<div class="r b"><span>${h(t('profit'))}</span><span>${h(Fmt.money(d.stats.revenue - d.exp))}</span></div><hr/>`,
      `<div class="b">${h(t('topProducts'))}</div>`, rows(d.top.map((x) => ({ name: `${x.name} x${x.qty}`, v: x.total }))),
      `<hr/><div class="b">${h(t('byCategory'))}</div>`, rows(d.cats.map((x) => ({ name: x.category, v: x.total }))),
    ].join('');
    try { await sharePdf(pageHtml(body, 0), 'Report'); } catch { toast(t('shareFailed'), 'error'); }
  };
  return (
    <Screen back title={t('reportsTitle')} onRefresh={reload}>
      <Chips value={range} onChange={setRange} items={[['today', t('today')], ['7', t('days7')], ['30', t('days30')]]} />
      {d ? <>
        <Grid>
          <StatCard icon="cash" tone="green" value={Fmt.money(d.stats.revenue)} label={t('revenue')} small />
          <StatCard icon="receipt" tone="blue" value={d.stats.count} label={t('sales')} small />
          <StatCard icon="analytics" tone="blue" value={Fmt.money(d.stats.average)} label={t('avgSale')} small />
          <StatCard icon="wallet" tone="blue" value={Fmt.money(d.exp)} label={t('expenses')} small />
        </Grid>
        <Card><Muted>{t('profit')}</Muted><T bold size={24} color={d.stats.revenue - d.exp < 0 ? C.danger : C.ink}>{Fmt.money(d.stats.revenue - d.exp)}</T></Card>
        <SectionLabel>{t('revenueTrend')}</SectionLabel>
        <Card><Bars rows={d.series.map((s) => ({ label: new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), value: s.revenue }))} /></Card>
        <SectionLabel>{t('topProducts')}</SectionLabel>
        <Card>{d.top.length ? <Bars rows={d.top.map((x) => ({ label: `${x.name} × ${x.qty}`, value: x.total }))} /> : <Muted>{t('noSales')}</Muted>}</Card>
        <SectionLabel>{t('byCategory')}</SectionLabel>
        <Card>{d.cats.length ? <Bars rows={d.cats.map((x) => ({ label: x.category, value: x.total }))} /> : <Muted>{t('noSales')}</Muted>}</Card>
        <Button icon="share-outline" variant="ghost" label={t('reportPdf')} onPress={pdf} />
      </> : null}
    </Screen>
  );
}
