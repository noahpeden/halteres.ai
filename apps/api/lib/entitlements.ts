import type { SupabaseClient } from '@supabase/supabase-js';

// Free tier limits. Bump when you raise prices.
export const FREE_LIMITS = {
  programs_per_month: 1,
  enhances_per_month: 5,
} as const;

export interface Entitlement {
  tier: 'free' | 'pro';
  enhances_this_month: number;
  programs_this_month: number;
  can_create_program: boolean;
  can_enhance: boolean;
}

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<Entitlement> {
  const { data, error } = await supabase
    .from('entitlement_status')
    .select('tier, enhances_this_month, programs_this_month')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    // Fail closed but don't deny — the trigger should have created a free row.
    return {
      tier: 'free',
      enhances_this_month: 0,
      programs_this_month: 0,
      can_create_program: true,
      can_enhance: true,
    };
  }
  const isPro = data.tier === 'pro';
  return {
    tier: data.tier as 'free' | 'pro',
    enhances_this_month: data.enhances_this_month as number,
    programs_this_month: data.programs_this_month as number,
    can_create_program:
      isPro || (data.programs_this_month as number) < FREE_LIMITS.programs_per_month,
    can_enhance:
      isPro || (data.enhances_this_month as number) < FREE_LIMITS.enhances_per_month,
  };
}

export class PaywallError extends Error {
  constructor(public readonly entitlement: Entitlement, public readonly action: 'create_program' | 'enhance') {
    super(`Paywall: ${action} blocked at ${entitlement.tier} tier`);
  }
}

export function paywallResponse(entitlement: Entitlement, action: PaywallError['action']) {
  return new Response(
    JSON.stringify({
      error: 'paywall',
      action,
      entitlement,
      free_limits: FREE_LIMITS,
    }),
    { status: 402, headers: { 'Content-Type': 'application/json' } }
  );
}
