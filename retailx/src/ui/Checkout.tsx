import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, KV, Muted, NumField, Row, SelectField, Sheet, T } from './kit';
import { useApp } from '../ctx/AppContext';
import { useCart } from '../ctx/Cart';
import { useSession } from '../ctx/Session';
import { useCan } from '../license/LicenseGate';
import { Repo } from '../db/repo';
import type { Customer, PayMethod, Sale, SaleItem } from '../db/types';
import { calcTotals, round2 } from '../lib/calc';
import { Fmt } from '../lib/format';
import { errKey } from '../lib/errors';
import { receiptHtml } from '../lib/receipt';
import { printHtml, sharePdf } from '../lib/print';
import { C } from '../lib/theme';

export function Checkout({ visible, onClose, onSold }: { visible: boolean; onClose: () => void; onSold: () => void }) {
  const { t, settings, toast } = useApp();
  const { lines, clear } = useCart();
  const { staff } = useSession();
  const can = useCan();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ sale: Sale; items: SaleItem[]; customer?: string } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDone(null); setCustomerId(''); setNewName(''); setDiscount(''); setMethod('cash'); setTendered('');
    Repo.listCustomers().then(setCustomers).catch(() => {});
  }, [visible]);

  const disc = Math.max(0, Number(discount) || 0);
  const totals = useMemo(() => calcTotals(lines, disc, settings.taxRate), [lines, disc, settings.taxRate]);
  const paid = method === 'cash' ? Number(tendered) || 0 : totals.total;
  const change = round2(Math.max(0, paid - totals.total));

  const complete = async () => {
    setBusy(true);
    try {
      let cid: number | null = customerId ? Number(customerId) : null;
      if (!cid && newName.trim()) cid = await Repo.saveCustomer({ name: newName.trim() });
      const sale = await Repo.createSale({
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price })),
        discount: disc, paymentMethod: method, tendered: method === 'cash' ? paid : undefined, customerId: cid, staffId: staff?.id ?? null,
      });
      const items = await Repo.getSaleItems(sale.id);
      const cust = cid ? (await Repo.getCustomer(cid))?.name : undefined;
      clear(); setDone({ sale, items, customer: cust }); onSold();
    } catch (e) {
      const k = errKey(e); toast(`${t(k.key)}${k.detail ? `: ${k.detail}` : ''}`, 'error');
    } finally { setBusy(false); }
  };

  const html = () => done ? receiptHtml({ settings, sale: done.sale, items: done.items, cashier: staff?.name, customer: done.customer }) : '';
  const canPrint = can('print.receipts');

  if (done) {
    return (
      <Sheet visible={visible} onClose={onClose} title={t('saleDone')}>
        <T center bold size={30} color={C.success}>{Fmt.money(done.sale.total)}</T>
        <Muted center style={{ marginBottom: 12 }}>{`#${done.sale.number}`}</Muted>
        {done.sale.paymentMethod === 'cash' && done.sale.tendered != null ? <KV k={t('change')} v={Fmt.money(Math.max(0, done.sale.tendered - done.sale.total))} /> : null}
        {canPrint ? (
          <Row style={{ marginVertical: 12 }}>
            <Button block variant="ghost" icon="print" label={t('printReceipt')} onPress={() => printHtml(html()).catch(() => toast(t('shareFailed'), 'error'))} />
            <Button block variant="ghost" icon="share-outline" label={t('sharePdf')} onPress={() => sharePdf(html(), `Receipt-${done.sale.number}`).catch(() => toast(t('shareFailed'), 'error'))} />
          </Row>
        ) : null}
        <Button icon="add" label={t('newSale')} onPress={onClose} />
      </Sheet>
    );
  }

  const methods: [PayMethod, string, React.ComponentProps<typeof Ionicons>['name']][] = [['cash', t('cash'), 'cash-outline'], ['card', t('card'), 'card-outline'], ['split', t('split'), 'swap-horizontal-outline']];
  return (
    <Sheet visible={visible} onClose={onClose} title={t('checkout')} scroll>
      <T bold size={14} style={{ marginBottom: 8 }}>{t('paymentMethod')}</T>
      <View style={{ gap: 8, marginBottom: 14 }}>
        {methods.map(([m, label, icon]) => {
          const on = method === m;
          return (
            <Pressable key={m} onPress={() => setMethod(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: on ? C.tint : '#fff', borderWidth: on ? 2 : 1, borderColor: on ? C.primary : C.line }}>
              <Ionicons name={icon} size={22} color={on ? C.primary : C.soft} />
              <T bold style={{ flex: 1 }} color={on ? C.primary : C.ink}>{label}</T>
              {on ? <Ionicons name="checkmark-circle" size={22} color={C.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
      {can('customers.manage') ? <>
        <SelectField label={t('customer')} value={customerId} searchable onChange={setCustomerId}
          options={[{ value: '', label: t('walkIn') }, ...customers.map((c) => ({ value: String(c.id), label: c.name, sub: c.phone }))]} />
        {!customerId ? <Field label={t('addCustomer')} value={newName} onChangeText={setNewName} /> : null}
      </> : null}
      {can('pos.discount') ? <NumField label={t('discount')} value={discount} onChangeText={setDiscount} placeholder="0" /> : null}
      {method === 'cash' ? <>
        <NumField label={t('received')} value={tendered} onChangeText={setTendered} placeholder={String(totals.total)} />
        <Row style={{ marginBottom: 12 }}>
          <Button small variant="ghost" label={t('exact')} onPress={() => setTendered(String(totals.total))} />
          <View style={{ flex: 1 }} /><Muted>{`${t('change')}: ${Fmt.money(change)}`}</Muted>
        </Row>
      </> : null}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 }}>
        <KV k={`${t('subtotal')} (${lines.reduce((n, l) => n + l.qty, 0)} ${t('items')})`} v={Fmt.money(totals.subtotal)} />
        {totals.discount ? <KV k={t('discount')} v={'-' + Fmt.money(totals.discount)} vColor={C.danger} /> : null}
        {totals.tax ? <KV k={t('tax')} v={Fmt.money(totals.tax)} /> : null}
        <View style={{ marginTop: 10, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <T bold color="#fff">{t('total')}</T><T bold color="#fff" size={17}>{Fmt.money(totals.total)}</T>
        </View>
      </View>
      <Button icon="checkmark-circle" label={t('completeSale')} onPress={complete} loading={busy} disabled={!lines.length} />
    </Sheet>
  );
}
