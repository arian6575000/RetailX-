import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, CheckRow, Credit, Field, Muted, Screen, T } from './kit';
import { C } from '../lib/theme';
import { useApp } from '../ctx/AppContext';
import { Repo } from '../db/repo';
import { DEMO_PRODUCTS } from '../data/demoProducts';
import { errKey } from '../lib/errors';

/** First-run wizard: store name, currency, owner account (admin + PIN) and optional demo catalogue. */
export default function Setup({ onDone }: { onDone: () => void | Promise<void> }) {
  const { t, settings, saveSettings, toast } = useApp();
  const [store, setStore] = useState('');
  const [currency, setCurrency] = useState(settings.currency || 'Rs');
  const [owner, setOwner] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!store.trim() || !owner.trim()) { toast(t('fillAll'), 'error'); return; }
    if (!/^\d{4}$/.test(pin)) { toast(t('pin4'), 'error'); return; }
    if (pin !== pin2) { toast(t('pinMismatch'), 'error'); return; }
    setBusy(true);
    try {
      await Repo.createStaff({ name: owner.trim(), role: 'admin', pin });
      await saveSettings({ ...(await Repo.getSettings()), businessName: store.trim(), ownerName: owner.trim(), currency: currency.trim() || 'Rs', setupDone: true });
      if (demo) await Repo.addProducts(DEMO_PRODUCTS);
      await onDone();
    } catch (e) { const k = errKey(e); toast(t(k.key), 'error'); setBusy(false); }
  };
  return (
    <Screen bare padBottom={60}>
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="storefront" size={40} color="#fff" /></View>
        </View>
        <T bold size={24} style={{ marginTop: 14 }}>{t('setupTitle')}</T>
        <Muted center>{t('setupSub')}</Muted>
      </View>
      <Card>
        <Field label={t('storeName')} value={store} onChangeText={setStore} />
        <Field label={t('currency')} value={currency} onChangeText={setCurrency} ltr />
        <Field label={t('ownerName')} value={owner} onChangeText={setOwner} />
        <Field label={t('ownerPin')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))} secureTextEntry keyboardType="number-pad" maxLength={4} ltr />
        <Field label={t('confirmOwnerPin')} value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, '').slice(0, 4))} secureTextEntry keyboardType="number-pad" maxLength={4} ltr />
        <CheckRow label={t('loadDemo')} value={demo} onChange={setDemo} />
      </Card>
      <Button icon="arrow-forward" label={t('startSelling')} onPress={go} loading={busy} style={{ marginTop: 12 }} />
      <Credit />
    </Screen>
  );
}
