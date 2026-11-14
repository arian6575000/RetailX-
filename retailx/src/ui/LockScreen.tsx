import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../ctx/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Credit, T } from './kit';
import { C, GRAD } from '../lib/theme';
import { biometricEnabled, biometricUnlock, checkPin, lockState, removePin, type PinResult } from '../lib/lock';
import { Repo } from '../db/repo';

/** Device-PIN lock by default. Pass `verify` to check a staff PIN instead (it must record attempts with lockoutRecord()). */
export function LockScreen({ onUnlock, verify, title }: { onUnlock: () => void; verify?: (pin: string) => Promise<PinResult>; title?: string }) {
  const { t, confirm, reloadSettings } = useApp();
  const [pin, setPin] = useState('');
  const [fails, setFails] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const [wait, setWait] = useState(0);

  const tryBio = useCallback(async () => { if (await biometricUnlock(t('enterPin'))) onUnlock(); }, [t, onUnlock]);
  useEffect(() => {
    (async () => {
      const ls = await lockState(); setFails(ls.count); setWait(ls.waitSec);
      if (!verify && (await biometricEnabled())) { setBio(true); if (!ls.waitSec) tryBio(); }
    })();
  }, [tryBio]);
  useEffect(() => { if (wait <= 0) return; const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000); return () => clearInterval(id); }, [wait > 0]);

  const press = async (k: string) => {
    if (busy || wait > 0) return;
    let next = pin;
    if (k === 'back') next = pin.slice(0, -1); else if (k === 'clear') next = ''; else if (pin.length < 4) next = pin + k;
    setPin(next); setMsg('');
    if (next.length === 4) {
      setBusy(true);
      const r = await (verify ? verify(next) : checkPin(next));
      if (r.ok) { onUnlock(); return; }
      setFails(r.count); setWait(r.waitSec); setPin(''); setMsg(r.waitSec ? t('pinWait').replace('{n}', String(r.waitSec)) : t('wrongPin')); setBusy(false);
    }
  };
  const forgot = async () => {
    if (!(await confirm(t('forgotPinMsg'), { danger: true, okLabel: t('eraseEverything') }))) return;
    await Repo.wipeAll(); await removePin(); await reloadSettings(); onUnlock();
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];
  return (
    <LinearGradient colors={GRAD.lock} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="lock-closed" size={34} color={C.primary} /></View>
        <T bold size={21} color="#fff" style={{ marginTop: 14 }}>{title ?? t('enterPin')}</T>
        <View style={{ flexDirection: 'row', gap: 16, marginVertical: 20 }}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff', backgroundColor: i < pin.length ? '#fff' : 'transparent' }} />)}
        </View>
        <T size={13} color="#FFD0D6" center style={{ minHeight: 28 }}>{wait > 0 ? t('pinWait').replace('{n}', String(wait)) : msg}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 14, justifyContent: 'center' }}>
          {keys.map((k) => (
            <Pressable key={k} onPress={() => press(k)} style={({ pressed }) => [styles.key, pressed && { backgroundColor: 'rgba(255,255,255,0.32)' }]}>
              {k === 'back' ? <Ionicons name="backspace-outline" size={26} color="#fff" /> : k === 'clear' ? <T bold size={18} color="#fff">C</T> : <T bold size={26} color="#fff">{k}</T>}
            </Pressable>
          ))}
        </View>
        {bio ? <Pressable onPress={tryBio} style={{ marginTop: 18, flexDirection: 'row', gap: 6, alignItems: 'center' }}><Ionicons name="finger-print" size={24} color="#fff" /><T bold size={13} color="#fff">{t('useBiometric')}</T></Pressable> : null}
        {fails >= 5 ? <Pressable onPress={forgot} style={{ marginTop: 16 }}><T bold size={13} color="#FFD0D6">{t('forgotPin')}</T></Pressable> : null}
        <Credit color="rgba(255,255,255,0.7)" style={{ marginTop: 16 }} />
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({ key: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' } });
