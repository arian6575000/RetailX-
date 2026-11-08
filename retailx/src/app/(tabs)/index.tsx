import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Chips, Empty, IconButton, ListItem, Muted, Row, Screen, SearchBar, T, Badge } from '../../ui/kit';
import { Scanner } from '../../ui/Scanner';
import { Checkout } from '../../ui/Checkout';
import { useApp } from '../../ctx/AppContext';
import { useCart } from '../../ctx/Cart';
import { useCan } from '../../license/LicenseGate';
import { Repo } from '../../db/repo';
import type { Product } from '../../db/types';
import { useLoad } from '../../lib/hooks';
import { Fmt } from '../../lib/format';
import { C } from '../../lib/theme';

export default function Register() {
  const { t, settings, toast } = useApp();
  const can = useCan();
  const cart = useCart();
  const [products, reload] = useLoad(() => Repo.listProducts(), []);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('__all');
  const [scan, setScan] = useState(false);
  const [pay, setPay] = useState(false);

  const cats = useMemo(() => Array.from(new Set((products || []).map((p) => p.category))).sort(), [products]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (products || []).filter((p) => (cat === '__all' || p.category === cat) && (!s || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(s)));
  }, [products, q, cat]);

  const addProduct = (p: Product) => {
    const inCart = cart.lines.find((l) => l.productId === p.id)?.qty || 0;
    if (p.stock != null && inCart + 1 > p.stock) { toast(`${t('err_outOfStock')}: ${p.name}`, 'error'); return; }
    cart.add(p);
  };
  const onCode = async (code: string) => {
    setScan(false);
    const p = await Repo.findByBarcode(code);
    if (p) { addProduct(p); toast(p.name, 'success'); } else toast(`${t('noProductForCode')} (${code})`, 'error');
  };

  if (!can('pos.billing')) return <Screen title={t('navRegister')}><Muted center style={{ marginTop: 40 }}>{t('featureLocked')}</Muted></Screen>;
  return (
    <Screen title={t('navRegister')} scroll={false} right={can('pos.scan') ? <IconButton icon="barcode-outline" onPress={() => setScan(true)} /> : undefined}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t("searchProducts")} />
      <View style={{ height: 10 }} />
      <Chips value={cat} onChange={setCat} items={[['__all', t('all')], ...cats.map((c) => [c, c] as [string, string])]} />
      {products && !products.length ? <Empty icon="cube-outline" title={t('noProducts')} text={t('noProductsHint')} /> : (
        <FlatList
          data={list} keyExtractor={(p) => String(p.id)} keyboardShouldPersistTaps="handled"
          onRefresh={reload} refreshing={false}
          contentContainerStyle={{ paddingBottom: cart.count ? 90 : 20 }}
          ListEmptyComponent={<Muted center style={{ marginTop: 30 }}>{t('noMatches')}</Muted>}
          renderItem={({ item: p }) => {
            const out = p.stock != null && p.stock <= 0;
            return (
              <ListItem
                onPress={out ? undefined : () => addProduct(p)} title={p.name} sub={p.category}
                trail={<><T bold>{Fmt.money(p.price)}</T>{out ? <Badge status="out" label={t('outOfStockLabel')} /> : p.stock != null && p.stock <= settings.lowStockThreshold ? <Badge status="low" label={`${p.stock} ${t('inStock')}`} /> : null}</>}
              />
            );
          }} />
      )}
      {cart.count > 0 ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
          <Button icon="cart" label={`${t('checkout')} · ${cart.count} ${t('items')} · ${Fmt.money(cart.subtotal)}`} onPress={() => setPay(true)} />
        </View>
      ) : null}
      <Scanner visible={scan} onClose={() => setScan(false)} onCode={onCode} />
      <Checkout visible={pay} onClose={() => setPay(false)} onSold={reload} />
    </Screen>
  );
}
