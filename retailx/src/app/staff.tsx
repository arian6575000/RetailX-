import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { Avatar, Badge, Button, CheckRow, Empty, Field, IconButton, ListItem, Muted, Screen, Segmented, Sheet, T } from '../ui/kit';
import { useApp } from '../ctx/AppContext';
import { useSession } from '../ctx/Session';
import { useLicense } from '../license/LicenseGate';
import { Repo } from '../db/repo';
import type { Role } from '../db/types';
import { useLoad } from '../lib/hooks';
import { errKey } from '../lib/errors';

type Form = { id?: number; name: string; role: Role; active: boolean; pin: string };

export default function StaffScreen() {
  const { t, toast, confirm } = useApp();
  const { staff: me, can } = useSession();
  const lic = useLicense();
  const [data, reload] = useLoad(async () => ({ list: await Repo.listStaff(), active: await Repo.countActiveStaff() }), []);
  const [f, setF] = useState<Form | null>(null);
  const limit = lic?.payload.max_users ?? 0;   // 0 = unlimited
  const pinSet = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const save = async () => {
    if (!f) return;
    try {
      const wasActive = f.id ? !!data?.list.find((s) => s.id === f.id)?.active : false;
      if (f.active && !wasActive && limit > 0 && (data?.active ?? 0) >= limit) { toast(t('err_userLimit').replace('{n}', String(limit)), 'error'); return; }
      if (!f.name.trim()) throw new Error('name');
      if (f.id) await Repo.updateStaff(f.id, { name: f.name.trim(), role: f.role, active: f.active, ...(f.pin ? { pin: f.pin } : {}) });
      else await Repo.createStaff({ name: f.name.trim(), role: f.role, pin: f.pin });
      setF(null); toast(t('saved'), 'success'); reload();
    } catch (e: any) { toast(t(e?.message === 'name' ? 'err_nameRequired' : errKey(e).key), 'error'); }
  };
  const del = async () => {
    if (!f?.id || f.id === me?.id || !(await confirm(t('deleteStaffMsg'), { danger: true, okLabel: t('delete') }))) return;
    try { await Repo.deleteStaff(f.id); setF(null); reload(); } catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  const add = () => {
    if (limit > 0 && (data?.active ?? 0) >= limit) { toast(t('err_userLimit').replace('{n}', String(limit)), 'error'); return; }
    setF({ name: '', role: 'cashier', active: true, pin: '' });
  };
  if (!can('staff.manage')) return <Screen back title={t('staffTitle')}><Muted center style={{ marginTop: 40 }}>{t('adminOnly')}</Muted></Screen>;
  return (
    <Screen back title={t('staffTitle')} subtitle={limit > 0 ? `${t('staffLimit')}: ${data?.active ?? 0}/${limit}` : undefined} scroll={false} right={<IconButton icon="person-add" onPress={add} />}>
      {data && !data.list.length ? <Empty icon="people-outline" title={t('staffTitle')} /> : (
        <FlatList data={data?.list || []} keyExtractor={(s) => String(s.id)} contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item: s }) => (
            <ListItem onPress={() => setF({ id: s.id, name: s.name, role: s.role, active: s.active, pin: '' })} left={<Avatar icon={s.role === 'admin' ? 'shield-checkmark' : 'person'} />} title={s.name}
              trail={<><Badge status={s.role === 'admin' ? 'neutral' : 'completed'} label={s.role === 'admin' ? t('admin') : t('cashierRole')} />{!s.active ? <Badge status="out" label={t('inactive')} /> : null}</>} />
          )} />
      )}
      <Sheet visible={!!f} onClose={() => setF(null)} title={f?.id ? t('editStaff') : t('addStaff')} scroll>
        {f ? <>
          <Field label={t('name')} value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <T size={12.5} bold style={{ marginBottom: 6 }}>{t('role')}</T>
          <Segmented value={f.role} onChange={(role) => setF({ ...f, role })} items={[['admin', t('admin')], ['cashier', t('cashierRole')]]} />
          <Field style={{ marginTop: 14 }} label={f.id ? t('newPinOptional') : t('pin4Label')} value={f.pin} onChangeText={(v) => setF({ ...f, pin: pinSet(v) })} secureTextEntry keyboardType="number-pad" maxLength={4} ltr />
          {f.id ? <CheckRow label={t('active')} value={f.active} onChange={(active) => setF({ ...f, active })} /> : null}
          <Button icon="checkmark" label={t('saveChanges')} onPress={save} style={{ marginTop: 6 }} />
          {f.id && f.id !== me?.id ? <Button variant="danger" label={t('delete')} onPress={del} style={{ marginTop: 10 }} /> : null}
        </> : null}
      </Sheet>
    </Screen>
  );
}
