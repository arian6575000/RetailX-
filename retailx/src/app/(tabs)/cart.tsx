import React, { useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card, Empty, IconButton, KV, Muted, Row, Screen, T } from '../../ui/kit';
import { Checkout } from '../../ui/Checkout';
import { useApp } from '../../ctx/AppContext';
import { useCart } from '../../ctx/Cart';
import { calcTotals, lineTotal } from '../../lib/calc';
import { Fmt } from '../../lib/format';
import { C } from '../../lib/theme';

/** Review the cart, change quantities, then continue to payment. */
export default function CartScreen() {
  const { t, settings, confirm } = useApp();
  const { lines, setQty, remove, clear, count } = useCart();
  const [pay, setPay] = useState(false);
  const sold = useRef(false);
  const totals = calcTotals(lines, 0, settings.taxRate);
  const stepper = (id: number, qty: number) => (
    <Row gap={6}>
      <IconButton icon="remove" size={16} onPress={() => setQty(id, qty - 1)} style={{ width: 30, height: 30, borderRadius: 15 }} />
      <T bold style={{ minWidth: 22 }} center>{String(qty)}</T>
      <IconButton icon="add" size={16} solid onPress={() => setQty(id, qty + 1)} style={{ width: 30, height: 30, borderRadius: 15 }} />
    </Row>
  );
  const clearAll = async () => { if (lines.length && (await confirm(t('clearCartMsg'), { danger: true, okLabel: t('clearCart') }))) clear(); };
  return (
    <Screen hero back title={t('cart')} scroll={false} right={lines.length ? <IconButton onDark icon="trash-outline" onPress={clearAll} /> : undefined}>
      {!lines.length ? (
        <Empty icon="cart-outline" title={t('emptyCart')} text={t('tapToAdd')} action={<Button label={t('continueSelling')} onPress={() => router.replace('/sell' as any)} />} />
      ) : (
        <>
          <FlatList data={lines} keyExtractor={(l) => String(l.productId)} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
            renderItem={({ item: l }) => (
              <Card style={{ marginBottom: 0, padding: 12 }}>
                <Row gap={12}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cube" size={24} color={C.accent} /></View>
                  <View style={{ flex: 1 }}>
                    <T bold size={14.5} numberOfLines={1}>{l.name}</T>
                    <Muted>{`${Fmt.money(l.price)} × ${l.qty} = ${Fmt.money(lineTotal(l.price, l.qty))}`}</Muted>
                    <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>{stepper(l.productId, l.qty)}</View>
                  </View>
                  <IconButton icon="close" size={16} onPress={() => remove(l.productId)} style={{ width: 28, height: 28, borderRadius: 14 }} />
                </Row>
              </Card>
            )} />
          <Card style={{ marginBottom: 10 }}>
            <KV k={`${t('subtotal')} (${count} ${t('items')})`} v={Fmt.money(totals.subtotal)} />
            {totals.tax ? <KV k={`${t('tax')} (${settings.taxRate}%)`} v={Fmt.money(totals.tax)} /> : null}
            <View style={{ marginTop: 10, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
              <T bold color="#fff">{t('total')}</T><T bold color="#fff" size={16}>{Fmt.money(totals.total)}</T>
            </View>
          </Card>
          <Button icon="arrow-forward" label={t('proceedCheckout')} onPress={() => setPay(true)} />
        </>
      )}
      <Checkout visible={pay} onSold={() => { sold.current = true; }} onClose={() => { setPay(false); if (sold.current) { sold.current = false; router.replace('/sell' as any); } }} />
    </Screen>
  );
}
