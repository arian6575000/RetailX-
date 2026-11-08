import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Badge, Button, Chips, Empty, IconButton, KV, ListItem, Muted, Row, Screen, Sheet, T } from '../../ui/kit';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { useCan } from '../../license/LicenseGate';
import { Repo } from '../../db/repo';
import type { Sale, SaleItem, Staff } from '../../db/types';
import { useLoad } from '../../lib/hooks';
import { startOfDayMs, daysAgoMs } from '../../lib/dates';
import { Fmt } from '../../lib/format';
import { errKey } from '../../lib/errors';
import { fmtDateTime, receiptHtml } from '../../lib/receipt';
import { printHtml, sharePdf } from '../../lib/print';
import { toCsv } from '../../lib/csv';
import { shareTextFile } from '../../lib/backup';

type Range = 'today' | '7' | '30' | 'all';

export default function History() {
  const { t, settings, toast, confirm } = useApp();
  const { staff, can } = useSession();
  const lic = useCan();
  const [range, setRange] = useState<Range>('today');
  const viewAll = can('sales.viewAll');
  const [data, reload] = useLoad(async () => {
    const from = range === 'today' ? startOfDayMs() : range === '7' ? daysAgoMs(6) : range === '30' ? daysAgoMs(29) : undefined;
    const [sales, staffList] = await Promise.all([Repo.listSales({ from, staffId: viewAll ? undefined : staff?.id ?? -1 }), Repo.listStaff()]);
    return { sales, staffList };
  }, [range, viewAll, staff?.id]);
  const [sel, setSel] = useState<{ sale: Sale; items: SaleItem[]; customer?: string } | null>(null);

  const names = new Map<number, string>((data?.staffList || []).map((s: Staff) => [s.id, s.name]));
  const open = async (sale: Sale) => {
    const [items, c] = await Promise.all([Repo.getSaleItems(sale.id), sale.customerId ? Repo.getCustomer(sale.customerId) : Promise.resolve(null)]);
    setSel({ sale, items, customer: c?.name });
  };
  const html = () => sel ? receiptHtml({ settings, sale: sel.sale, items: sel.items, cashier: sel.sale.staffId ? names.get(sel.sale.staffId) : undefined, customer: sel.customer }) : '';
  const refund = async () => {
    if (!sel || !(await confirm(t('refundMsg'), { danger: true, okLabel: t('refund') }))) return;
    try { await Repo.refundSale(sel.sale.id, staff?.id ?? null); setSel(null); toast(t('refundDone'), 'success'); reload(); }
    catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  const exportCsv = async () => {
    const rows = (data?.sales || []).map((s) => [s.number, fmtDateTime(s.createdAt), s.staffId ? names.get(s.staffId) ?? '' : '', s.paymentMethod, s.subtotal, s.discount, s.tax, s.total, s.status]);
    try { await shareTextFile(`sales-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(['Receipt', 'Date', 'Cashier', 'Method', 'Subtotal', 'Discount', 'Tax', 'Total', 'Status'], rows), 'text/csv'); }
    catch { toast(t('shareFailed'), 'error'); }
  };
  const canRefund = can('sale.refund');
  const total = (data?.sales || []).filter((s) => s.status === 'completed').reduce((n, s) => n + s.total, 0);

  return (
    <Screen title={t('historyTitle')} scroll={false} right={can('report.view') || viewAll ? <IconButton icon="download-outline" onPress={exportCsv} /> : undefined}>
      <Chips value={range} onChange={setRange} items={[['today', t('today')], ['7', t('days7')], ['30', t('days30')], ['all', t('allTime')]]} />
      {data && data.sales.length ? <Muted style={{ marginBottom: 6 }}>{`${data.sales.length} ${t('sales')} · ${Fmt.money(total)}`}</Muted> : null}
      {data && !data.sales.length ? <Empty icon="receipt-outline" title={t('noSales')} /> : (
        <FlatList data={data?.sales || []} keyExtractor={(s) => String(s.id)} onRefresh={reload} refreshing={false} contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item: s }) => (
            <ListItem onPress={() => open(s)} title={`#${s.number}`} sub={fmtDateTime(s.createdAt)} sub2={s.staffId ? names.get(s.staffId) : undefined}
              trail={<><T bold>{Fmt.money(s.total)}</T><Badge status={s.status === 'refunded' ? 'refunded' : 'completed'} label={s.status === 'refunded' ? t('refunded') : t(s.paymentMethod)} /></>} />
          )} />
      )}
      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel ? `#${sel.sale.number}` : ''} scroll>
        {sel ? <>
          <Muted center style={{ marginBottom: 8 }}>{fmtDateTime(sel.sale.createdAt)}</Muted>
          {sel.items.map((i) => <KV key={i.id} k={`${i.name} × ${i.qty}`} v={Fmt.money(i.lineTotal)} />)}
          <View style={{ height: 8 }} />
          <KV k={t('subtotal')} v={Fmt.money(sel.sale.subtotal)} />
          {sel.sale.discount ? <KV k={t('discount')} v={'-' + Fmt.money(sel.sale.discount)} /> : null}
          {sel.sale.tax ? <KV k={t('tax')} v={Fmt.money(sel.sale.tax)} /> : null}
          <KV k={t('total')} v={<T bold>{Fmt.money(sel.sale.total)}</T>} />
          <KV k={t('method')} v={t(sel.sale.paymentMethod)} />
          {sel.customer ? <KV k={t('customer')} v={sel.customer} /> : null}
          {sel.sale.status === 'refunded' ? <KV k={t('status')} v={t('refunded')} /> : null}
          <View style={{ height: 12 }} />
          {lic('print.receipts') ? <Row style={{ marginBottom: 10 }}>
            <Button block variant="ghost" icon="print" label={t('printReceipt')} onPress={() => printHtml(html()).catch(() => toast(t('shareFailed'), 'error'))} />
            <Button block variant="ghost" icon="share-outline" label={t('sharePdf')} onPress={() => sharePdf(html(), `Receipt-${sel.sale.number}`).catch(() => toast(t('shareFailed'), 'error'))} />
          </Row> : null}
          {canRefund && sel.sale.status === 'completed' ? <Button variant="danger" icon="return-down-back" label={t('refund')} onPress={refund} /> : null}
        </> : null}
      </Sheet>
    </Screen>
  );
}
