'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { browserSupabase } from '@/lib/supabase/client';
import { initPosthog, posthog } from '@/lib/posthog';

export function Analytics() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    initPosthog();
    browserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) posthog.identify(data.user.id, { email: data.user.email });
      });
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const url = pathname + (params?.toString() ? `?${params.toString()}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, params]);

  return null;
}
