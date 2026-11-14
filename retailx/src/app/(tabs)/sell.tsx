import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Chips, Empty, IconButton, Muted, Screen, SearchBar, T } from '../../ui/kit';
import { Scanner } from '../../ui/Scanner';
import { useApp } from '../../ctx/AppContext';
import { useCart } from '../../ctx/Cart';
import { useCan } from '../../license/LicenseGate';
import { Repo } from '../../db/repo';
import type { Product } from '../../db/types';
import { useLoad } from '../../lib/hooks';
import { Fmt } from '../../lib/format';
import { C, shadowSm } from '../../lib/theme';

/** Product grid: tap + to add to the cart, then open the cart to check out. */
export default function Sell() {
  const { t, settings, toast } = useApp();
  const can = useCan();
  const cart = useCart();
  const [products] = useLoad(() => Repo.listProducts(), []);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('__all');
  const [scan, setScan] = useState(false);

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

  if (!can('pos.billing')) return <Screen hero title={t('navRegister')}><Muted center style={{ marginTop: 40 }}>{t('featureLocked')}</Muted></Screen>;
  const right = (
    <>
      {can('pos.scan') ? <IconButton onDark icon="barcode-outline" onPress={() => setScan(true)} /> : null}
      <View>
        <IconButton onDark icon="cart-outline" onPress={() => router.push('/cart' as any)} />
        {cart.count > 0 ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><T size={10} bold color="#fff" center>{String(cart.count)}</T></View> : null}
      </View>
    </>
  );
  return (
    <Screen hero title={t('sellScreenTitle')} scroll={false} right={right}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('searchProducts')} />
      <Chips value={cat} onChange={setCat} items={[['__all', t('all')], ...cats.map((c) => [c, c] as [string, string])]} />
      {products && !products.length ? <Empty icon="cube-outline" title={t('noProducts')} text={t('noProductsHint')} /> : (
        <FlatList
          data={list} keyExtractor={(p) => String(p.id)} numColumns={2} keyboardShouldPersistTaps="handled"
          columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ gap: 12, paddingBottom: cart.count ? 90 : 20 }}
          ListEmptyComponent={<Muted center style={{ marginTop: 30 }}>{t('noMatches')}</Muted>}
          renderItem={({ item: p }) => {
            const out = p.stock != null && p.stock <= 0;
            const low = !out && p.stock != null && p.stock <= settings.lowStockThreshold;
            const inCart = cart.lines.find((l) => l.productId === p.id)?.qty || 0;
            return (
              <Pressable disabled={out} onPress={() => addProduct(p)} style={[{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: C.line, opacity: out ? 0.5 : 1 }, shadowSm]}>
                <View style={{ height: 78, borderRadius: 14, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cube" size={34} color={C.accent} />
                  {inCart > 0 ? <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 }}><T size={11} bold color="#fff">{`×${inCart}`}</T></View> : null}
                </View>
                <T bold size={13.5} numberOfLines={1} style={{ marginTop: 8 }}>{p.name}</T>
                <Muted numberOfLines={1}>{out ? t('outOfStockLabel') : low ? `${p.stock} ${t('inStock')}` : p.category}</Muted>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <T bold size={13.5} color={C.primary} numberOfLines={1} style={{ flexShrink: 1 }}>{Fmt.money(p.price)}</T>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" size={18} color="#fff" /></View>
                </View>
              </Pressable>
            );
          }} />
      )}
      {cart.count > 0 ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
          <Button icon="cart" label={`${t('viewCart')} · ${cart.count} ${t('items')} · ${Fmt.money(cart.subtotal)}`} onPress={() => router.push('/cart' as any)} />
        </View>
      ) : null}
      <Scanner visible={scan} onClose={() => setScan(false)} onCode={onCode} />
    </Screen>
  );
}
