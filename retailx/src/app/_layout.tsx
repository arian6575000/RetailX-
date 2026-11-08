import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SQLite from 'expo-sqlite';
import * as ScreenCapture from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from '../lib/fonts';
import { APP } from '../lib/brand';
import { AppProvider } from '../ctx/AppContext';
import { SessionProvider, useSession } from '../ctx/Session';
import { CartProvider } from '../ctx/Cart';
import { Repo, initRepo } from '../db/repo';
import { fromExpo } from '../db/expoAdapter';
import { lockoutGate, lockoutRecord, type PinResult } from '../lib/lock';
import { LockScreen } from '../ui/LockScreen';
import Setup from '../ui/Setup';
import LicenseGate from '../license/LicenseGate';
import { useApp } from '../ctx/AppContext';
import { C } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Setup (first run) -> staff PIN login -> app. */
function Gate() {
  const { staff, hasStaff, login, refreshGate } = useSession();
  const { reloadSettings, t } = useApp();
  const verify = useCallback(async (pin: string): Promise<PinResult> => {
    const gate = await lockoutGate();
    if (gate) return gate;
    const s = await Repo.findStaffByPin(pin);
    if (s) login(s);
    return lockoutRecord(!!s);
  }, [login]);
  const done = useCallback(async () => { await reloadSettings(); await refreshGate(); }, [reloadSettings, refreshGate]);

  if (hasStaff === null) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>;
  if (!hasStaff) return <Setup onDone={done} />;
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />
      {!staff ? <LockScreen title={t('whoIsThis')} verify={verify} onUnlock={done} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Business data: no screenshots / screen recording, recent-apps thumbnail blanked (Android FLAG_SECURE).
  useEffect(() => { ScreenCapture.preventScreenCaptureAsync().catch(() => {}); }, []);

  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(APP.dbName);
        await db.execAsync('PRAGMA journal_mode = WAL;');
        await initRepo(fromExpo(db));
        setDbReady(true);
      } catch (e: any) { setDbError(String(e?.message || e)); }
    })();
  }, []);

  const ready = (fontsLoaded || !!fontError) && dbReady;
  useEffect(() => { if (ready || dbError) SplashScreen.hideAsync().catch(() => {}); }, [ready, dbError]);

  if (dbError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.bg }}><Text style={{ color: C.danger, fontWeight: '700' }}>Could not open the database</Text><Text style={{ marginTop: 8, color: C.soft }}>{dbError}</Text></View>;
  }
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator color={C.primary} /></View>;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <LicenseGate>
          <SessionProvider>
            <CartProvider>
              <Gate />
            </CartProvider>
          </SessionProvider>
        </LicenseGate>
      </AppProvider>
    </SafeAreaProvider>
  );
}
