import { useState } from 'react';
import { PaywallError } from './api';

// Hook that wraps an async action, catches PaywallError, exposes paywall state.
export function usePaywall() {
  const [reason, setReason] = useState<'create_program' | 'enhance' | null>(null);

  function trigger(action: 'create_program' | 'enhance') {
    setReason(action);
  }

  function close() {
    setReason(null);
  }

  async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof PaywallError) {
        setReason(e.action);
        return undefined;
      }
      throw e;
    }
  }

  return { reason, visible: reason !== null, trigger, close, guard };
}
