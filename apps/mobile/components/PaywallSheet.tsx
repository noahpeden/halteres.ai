import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { purchasePro, restorePurchases } from '@/lib/purchases';

interface Props {
  visible: boolean;
  reason: 'create_program' | 'enhance' | null;
  onClose: () => void;
  onUpgraded: () => void;
}

const FALLBACK_BILLING_URL = process.env.EXPO_PUBLIC_WEB_URL
  ? `${process.env.EXPO_PUBLIC_WEB_URL}/billing`
  : 'http://localhost:3000/billing';

export function PaywallSheet({ visible, reason, onClose, onUpgraded }: Props) {
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'web' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy('purchase');
    setError(null);
    try {
      const ok = await purchasePro();
      if (ok) {
        onUpgraded();
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy('restore');
    setError(null);
    try {
      const ok = await restorePurchases();
      if (ok) {
        onUpgraded();
        onClose();
      } else {
        setError('No active subscription found.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function web() {
    setBusy('web');
    await WebBrowser.openBrowserAsync(FALLBACK_BILLING_URL);
    setBusy(null);
  }

  const headline =
    reason === 'create_program'
      ? 'You hit the free program limit'
      : 'You hit the free enhance limit';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-bg px-6 pt-12 gap-6">
        <View>
          <Text className="text-fg text-2xl font-semibold mb-1">{headline}</Text>
          <Text className="text-muted">
            Upgrade to Halteres Pro for unlimited programs, enhances, and day-of adaptations.
          </Text>
        </View>

        <View className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 gap-2">
          <Text className="text-fg text-lg font-semibold">Halteres Pro · $14.99/mo</Text>
          <Text className="text-muted">• Unlimited programs</Text>
          <Text className="text-muted">• Unlimited enhanced workouts</Text>
          <Text className="text-muted">• Unlimited day-of adapts</Text>
          <Text className="text-muted">• RAG personalization (improves every workout)</Text>
        </View>

        <Pressable
          onPress={buy}
          disabled={busy !== null}
          className="bg-accent rounded-md py-4 items-center"
        >
          {busy === 'purchase' ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Subscribe</Text>
          )}
        </Pressable>

        <View className="flex-row gap-2">
          <Pressable
            onPress={restore}
            disabled={busy !== null}
            className="flex-1 border border-zinc-800 rounded-md py-3 items-center"
          >
            <Text className="text-fg">Restore purchases</Text>
          </Pressable>
          <Pressable
            onPress={web}
            disabled={busy !== null}
            className="flex-1 border border-zinc-800 rounded-md py-3 items-center"
          >
            <Text className="text-fg">Manage on web</Text>
          </Pressable>
        </View>

        {error && <Text className="text-red-400 text-sm">{error}</Text>}

        <Pressable onPress={onClose} className="self-center mt-4">
          <Text className="text-muted">Maybe later</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
