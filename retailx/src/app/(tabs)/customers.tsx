import React, { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Avatar, Button, Empty, Field, IconButton, ListItem, Muted, Row, Screen, SearchBar, Sheet, T } from '../../ui/kit';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { Repo } from '../../db/repo';
import type { Customer } from '../../db/types';
import { useLoad } from '../../lib/hooks';
import { errKey } from '../../lib/errors';
import { Fmt } from '../../lib/format';

export default function Customers() {
  const { t, toast, confirm } = useApp();
  const { can } = useSession();
  const [list, reload] = useLoad(() => Repo.listCustomers(), []);
  const [q, setQ] = useState('');
  const [f, setF] = useState<{ id?: number; name: string; phone: string; notes: string } | null>(null);
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return (list || []).filter((c) => !s || `${c.name} ${c.phone}`.toLowerCase().includes(s)); }, [list, q]);
  const open = (c?: Customer) => setF(c ? { id: c.id, name: c.name, phone: c.phone, notes: c.notes } : { name: '', phone: '', notes: '' });
  const save = async () => {
    if (!f) return;
    try { await Repo.saveCustomer({ ...f, name: f.name.trim() }); setF(null); toast(t('saved'), 'success'); reload(); }
    catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  const del = async () => {
    if (!f?.id || !can('customer.delete') || !(await confirm(t('deleteCustomerMsg'), { danger: true, okLabel: t('delete') }))) return;
    await Repo.deleteCustomer(f.id); setF(null); reload();
  };
  return (
    <Screen back title={t('customersTitle')} scroll={false} right={<IconButton solid icon="add" onPress={() => open()} />}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('search')} />
            {list && !list.length ? <Empty icon="people-outline" title={t('noCustomers')} action={<Button label={t('addCustomer')} onPress={() => open()} />} /> : (
        <FlatList data={shown} keyExtractor={(c) => String(c.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item: c }) => (
            <ListItem card onPress={() => open(c)} left={<Avatar text={Fmt.initials(c.name)} />} title={c.name} sub={c.phone || undefined}
              trail={<><T bold>{Fmt.money(c.totalSpent)}</T><Muted>{`${c.visits} ${t('visits')}`}</Muted></>} />
          )} />
      )}
      <Sheet visible={!!f} onClose={() => setF(null)} title={f?.id ? t('editCustomer') : t('addCustomer')} scroll>
        {f ? <>
          <Field label={t('name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label={t('phone')} value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" ltr />
          <Field label={t('notes')} value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} multiline />
          <Row>
            {f.id && can('customer.delete') ? <Button block variant="danger" label={t('delete')} onPress={del} /> : null}
            <Button block icon="checkmark" label={t('saveChanges')} onPress={save} />
          </Row>
        </> : null}
      </Sheet>
    </Screen>
  );
}
