import React, { useRef } from 'react';
import { Modal, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton, T } from './kit';
import { useApp } from '../ctx/AppContext';

/** Full-screen barcode scanner. Calls onCode once per scan, then closes. */
export function Scanner({ visible, onClose, onCode }: { visible: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const { t } = useApp();
  const [perm, ask] = useCameraPermissions();
  const done = useRef(false);
  React.useEffect(() => { if (visible) done.current = false; }, [visible]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {perm?.granted ? (
          <CameraView
            style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
            onBarcodeScanned={(r) => { if (done.current) return; done.current = true; onCode(String(r.data).trim()); }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <T color="#fff" center style={{ marginBottom: 14 }}>{t('cameraDenied')}</T>
            <Button label={t('enable')} onPress={() => ask()} />
          </View>
        )}
        {perm?.granted ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 260, height: 170 }}>
              {([{ top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 }, { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 }, { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 }, { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 }] as const).map((c, i) => (
                <View key={i} style={[{ position: 'absolute', width: 44, height: 44, borderColor: '#fff' }, c]} />
              ))}
            </View>
          </View>
        ) : null}
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onDark icon="close" onPress={onClose} />
          <T bold size={17} color="#fff">{t('navRegister')}</T>
          <View style={{ width: 38 }} />
        </SafeAreaView>
        <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, alignItems: 'center' }}>
          <T bold color="#fff" center>{t('scanBarcode')}</T>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
