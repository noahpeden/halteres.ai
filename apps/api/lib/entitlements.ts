import type { SupabaseClient } from '@supabase/supabase-js';

export const FREE_LIMITS = {
  programs_per_month: 1,
  enhances_per_month: 5,
} as const;

export const MARKETPLACE_TAKE_RATE = 0.2; // 20% platform fee on paid template forks
export const COACH_SEATS_DEFAULT = 10;

export type Tier = 'free' | 'pro' | 'coach';
export type Cadence = 'monthly' | 'annual' | 'one_time';

export interface Entitlement {
  tier: Tier;
  cadence: Cadence;
  seats: number;
  enhances_this_month: number;
  programs_this_month: number;
  coached_athletes: number;
  can_create_program: boolean;
  can_enhance: boolean;
  can_invite_coach_athlete: boolean;
}

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<Entitlement> {
  const { data, error } = await supabase
    .from('entitlement_status')
    .select('tier, cadence, seats, enhances_this_month, programs_this_month, coached_athletes')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    return {
      tier: 'free',
      cadence: 'monthly',
      seats: 0,
      enhances_this_month: 0,
      programs_this_month: 0,
      coached_athletes: 0,
      can_create_program: true,
      can_enhance: true,
      can_invite_coach_athlete: false,
    };
  }
  const tier = (data.tier as Tier) ?? 'free';
  const isPaid = tier === 'pro' || tier === 'coach';
  const seats = (data.seats as number) ?? 0;
  const coached = (data.coached_athletes as number) ?? 0;
  return {
    tier,
    cadence: (data.cadence as Cadence) ?? 'monthly',
    seats,
    enhances_this_month: data.enhances_this_month as number,
    programs_this_month: data.programs_this_month as number,
    coached_athletes: coached,
    can_create_program:
      isPaid || (data.programs_this_month as number) < FREE_LIMITS.programs_per_month,
    can_enhance: isPaid || (data.enhances_this_month as number) < FREE_LIMITS.enhances_per_month,
    can_invite_coach_athlete: tier === 'coach' && coached < seats,
  };
}

export class PaywallError extends Error {
  constructor(
    public readonly entitlement: Entitlement,
    public readonly action: 'create_program' | 'enhance' | 'invite_athlete'
  ) {
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
