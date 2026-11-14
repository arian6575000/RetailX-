import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Badge, Button, Chips, Empty, Field, IconButton, ListItem, Muted, NumField, Row, Screen, SearchBar, Sheet, T } from '../../ui/kit';
import { Scanner } from '../../ui/Scanner';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { useCan } from '../../license/LicenseGate';
import { Repo } from '../../db/repo';
import type { Product } from '../../db/types';
import { useLoad } from '../../lib/hooks';
import { errKey } from '../../lib/errors';
import { Fmt } from '../../lib/format';

type Form = { id?: number; name: string; category: string; price: string; cost: string; stock: string; unit: string; barcode: string; sku: string };
const blank: Form = { name: '', category: '', price: '', cost: '', stock: '', unit: 'ea', barcode: '', sku: '' };

export default function Products() {
  const { t, settings, toast, confirm } = useApp();
  const { can } = useSession();
  const lic = useCan();
  const [products, reload] = useLoad(() => Repo.listProducts(), []);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [f, setF] = useState<Form | null>(null);
  const [scan, setScan] = useState(false);
  const set = (k: keyof Form, v: string) => setF((p) => (p ? { ...p, [k]: v } : p));

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (products || []).filter((p) => {
      if (filter === 'out' && !(p.stock != null && p.stock <= 0)) return false;
      if (filter === 'low' && !(p.stock != null && p.stock > 0 && p.stock <= settings.lowStockThreshold)) return false;
      return !s || `${p.name} ${p.sku} ${p.barcode} ${p.category}`.toLowerCase().includes(s);
    });
  }, [products, q, filter, settings.lowStockThreshold]);

  const open = (p?: Product) => setF(p ? { id: p.id, name: p.name, category: p.category, price: String(p.price), cost: p.cost == null ? '' : String(p.cost), stock: p.stock == null ? '' : String(p.stock), unit: p.unit, barcode: p.barcode, sku: p.sku } : { ...blank });
  const save = async () => {
    if (!f) return;
    try {
      await Repo.saveProduct({
        id: f.id, name: f.name.trim(), category: f.category.trim() || 'Other', price: Number(f.price), cost: f.cost.trim() === '' ? null : Number(f.cost),
        stock: f.stock.trim() === '' ? null : Number(f.stock), unit: f.unit.trim() || 'ea', barcode: f.barcode.trim(), sku: f.sku.trim(),
      });
      setF(null); toast(t('saved'), 'success'); reload();
    } catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  const del = async () => {
    if (!f?.id || !(await confirm(t('deleteProductMsg'), { danger: true, okLabel: t('delete') }))) return;
    await Repo.deleteProduct(f.id); setF(null); reload();
  };

  if (!can('product.edit')) return <Screen title={t('navProducts')}><Muted center style={{ marginTop: 40 }}>{t('adminOnly')}</Muted></Screen>;
  return (
    <Screen back title={t('productsTitle')} scroll={false} right={<IconButton solid icon="add" onPress={() => open()} />}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('searchProducts')} />
      <View style={{ height: 10 }} />
      <Chips value={filter} onChange={setFilter} items={[['all', t('all')], ['low', t('low')], ['out', t('out')]]} />
      {products && !products.length ? <Empty icon="cube-outline" title={t('noProducts')} text={t('noProductsHint')} action={<Button label={t('addProduct')} onPress={() => open()} />} /> : (
        <FlatList data={list} keyExtractor={(p) => String(p.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item: p }) => (
            <ListItem card onPress={() => open(p)} title={p.name} sub={`${p.category}${p.sku ? ` · ${p.sku}` : ''}`}
              trail={<><T bold>{Fmt.money(p.price)}</T>{p.stock == null ? <Muted>{t('unlimited')}</Muted> : p.stock <= 0 ? <Badge status="out" label={t('outOfStockLabel')} /> : <Badge status={p.stock <= settings.lowStockThreshold ? 'low' : 'completed'} label={`${p.stock} ${p.unit}`} />}</>} />
          )} />
      )}
      <Sheet visible={!!f} onClose={() => setF(null)} title={f?.id ? t('editProduct') : t('addProduct')} scroll>
        {f ? <>
          <Field label={t('name')} value={f.name} onChangeText={(v) => set('name', v)} />
          <Field label={t('category')} value={f.category} onChangeText={(v) => set('category', v)} />
          <Row align="flex-start"><View style={{ flex: 1 }}><NumField label={t('price')} value={f.price} onChangeText={(v) => set('price', v)} /></View><View style={{ flex: 1 }}><NumField label={t('costPrice')} value={f.cost} onChangeText={(v) => set('cost', v)} /></View></Row>
          <Row align="flex-start"><View style={{ flex: 1 }}><NumField label={t('stock')} value={f.stock} onChangeText={(v) => set('stock', v)} hint={t('stockHint')} /></View><View style={{ flex: 1 }}><Field label={t('unit')} value={f.unit} onChangeText={(v) => set('unit', v)} ltr /></View></Row>
          <Row align="flex-end">
            <View style={{ flex: 1 }}><Field label={t('barcode')} value={f.barcode} onChangeText={(v) => set('barcode', v)} ltr /></View>
            {lic('pos.scan') ? <IconButton icon="barcode-outline" onPress={() => setScan(true)} style={{ marginBottom: 14 }} /> : null}
          </Row>
          <Field label={t('sku')} value={f.sku} onChangeText={(v) => set('sku', v)} ltr />
          <Row>
            {f.id ? <Button block variant="danger" label={t('delete')} onPress={del} /> : null}
            <Button block icon="checkmark" label={t('saveChanges')} onPress={save} />
          </Row>
        </> : null}
      </Sheet>
      <Scanner visible={scan} onClose={() => setScan(false)} onCode={(c) => { setScan(false); set('barcode', c); }} />
    </Screen>
  );
}
