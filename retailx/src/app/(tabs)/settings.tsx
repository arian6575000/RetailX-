import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Button, Card, Credit, Field, ListItem, Muted, NumField, Row, Screen, SectionLabel, Segmented, T } from '../../ui/kit';
import { usePinPrompt } from '../../ui/PinPrompt';
import { useApp } from '../../ctx/AppContext';
import { useSession } from '../../ctx/Session';
import { Repo } from '../../db/repo';
import type { Settings } from '../../db/types';
import { APP } from '../../lib/brand';
import { errKey } from '../../lib/errors';
import { C } from '../../lib/theme';

export default function More() {
  const { t, settings, saveSettings, toast } = useApp();
  const { staff, can, logout } = useSession();
  const [f, setF] = useState<Settings>(settings);
  const [pinEl, askPin] = usePinPrompt();
  useEffect(() => { setF(settings); }, [settings]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => { await saveSettings({ ...f, taxRate: Math.max(0, Number(f.taxRate) || 0), lowStockThreshold: Math.max(0, Math.floor(Number(f.lowStockThreshold) || 0)) }); toast(t('saved'), 'success'); };

  const changeMyPin = async () => {
    if (!staff) return;
    const cur = await askPin(t('oldPin')); if (!cur) return;
    if (!(await Repo.verifyStaffPin(staff.id, cur))) { toast(t('wrongPin'), 'error'); return; }
    const a = await askPin(t('newPin')); if (!a) return;
    const b = await askPin(t('confirmPin')); if (!b) return;
    if (a !== b) { toast(t('pinMismatch'), 'error'); return; }
    try { await Repo.updateStaff(staff.id, { pin: a }); toast(t('pinSet'), 'success'); } catch (e) { toast(t(errKey(e).key), 'error'); }
  };
  const link = (icon: React.ComponentProps<typeof Ionicons>['name'], title: string, to: string, show: boolean) => show ? (
    <Card key={to} style={{ marginBottom: 10 }} onPress={() => router.push(to as any)}>
      <Row gap={12}><Ionicons name={icon} size={24} color={C.primary} /><T bold style={{ flex: 1 }}>{title}</T><Ionicons name="chevron-forward" size={18} color={C.faint} /></Row>
    </Card>
  ) : null;

  return (
    <Screen title={t('moreTitle')} subtitle={staff ? `${t('loggedInAs')} ${staff.name}` : undefined} padBottom={60}>
      {link('bar-chart', t('reportsTitle'), '/reports', can('report.view'))}
      {link('wallet', t('expensesTitle'), '/expenses', can('expense.manage'))}
      {link('people-circle', t('staffTitle'), '/staff', can('staff.manage'))}
      {link('cloud-upload', t('backupRestore'), '/backup', can('backup'))}

      {can('settings.edit') ? <>
        <SectionLabel>{t('storeInfo')}</SectionLabel>
        <Card>
          <Field label={t('businessName')} value={f.businessName} onChangeText={(v) => set('businessName', v)} />
          <Field label={t('phone')} value={f.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" ltr />
          <Field label={t('address')} value={f.address} onChangeText={(v) => set('address', v)} multiline />
          <Field label={t('currency')} value={f.currency} onChangeText={(v) => set('currency', v)} ltr />
          <Row align="flex-start">
            <View style={{ flex: 1 }}><NumField label={t('taxRate')} value={String(f.taxRate)} onChangeText={(v) => set('taxRate', v as any)} /></View>
            <View style={{ flex: 1 }}><NumField label={t('lowStockAt')} value={String(f.lowStockThreshold)} onChangeText={(v) => set('lowStockThreshold', v as any)} /></View>
          </Row>
          <T size={12.5} bold color={C.soft} style={{ marginBottom: 6 }}>{t('receiptFormat')}</T>
          <Segmented value={f.receiptFormat} onChange={(v) => set('receiptFormat', v)} items={[['thermal80', t('thermal80')], ['thermal58', t('thermal58')], ['a4', t('a4')]]} />
          <View style={{ height: 14 }} />
          <Field label={t('receiptFooter')} value={f.receiptFooter} onChangeText={(v) => set('receiptFooter', v)} style={{ marginBottom: 0 }} />
        </Card>
        <Button icon="checkmark" label={t('saveChanges')} onPress={save} style={{ marginTop: 12 }} />
      </> : null}

      <SectionLabel>{t('security')}</SectionLabel>
      <Card flush>
        <ListItem title={t('myPin')} onPress={changeMyPin} trail={<Ionicons name="key-outline" size={20} color={C.primary} />} />
        <ListItem last title={t('lockNow')} onPress={logout} trail={<Ionicons name="lock-closed-outline" size={20} color={C.primary} />} />
      </Card>
      <Muted center style={{ marginTop: 14 }}>{`${APP.name} · ${t('version')} ${Constants.expoConfig?.version ?? ''}`}</Muted>
      <Credit />
      {pinEl}
    </Screen>
  );
}
