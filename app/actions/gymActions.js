'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper to create supabase client
async function createSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// Generate a random invite code
function generateInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// GYM CRUD OPERATIONS
// ============================================

export async function createGymAction(formData) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Generate unique invite code
    const inviteCode = generateInviteCode();

    const gymData = {
      owner_id: user.id,
      name: formData.name,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      timezone: formData.timezone || 'America/New_York',
      invite_code: inviteCode,
      require_approval: formData.require_approval ?? false,
    };

    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .insert([gymData])
      .select()
      .single();

    if (gymError) throw gymError;

    // Create owner membership
    const { error: membershipError } = await supabase
      .from('gym_memberships')
      .insert([
        {
          gym_id: gym.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        },
      ]);

    if (membershipError) throw membershipError;

    return { success: true, data: gym };
  } catch (error) {
    console.error('Create Gym Error:', error);
    return {
      success: false,
      error: `Failed to create gym: ${error.message}`,
    };
  }
}

export async function updateGymAction(gymId, formData) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const updateData = {
      name: formData.name,
      description: formData.description,
      logo_url: formData.logo_url,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      timezone: formData.timezone,
      require_approval: formData.require_approval,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const { data, error } = await supabase
      .from('gyms')
      .update(updateData)
      .eq('id', gymId)
      .eq('owner_id', user.id) // Ensure owner is updating
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Update Gym Error:', error);
    return {
      success: false,
      error: `Failed to update gym: ${error.message}`,
    };
  }
}

export async function deleteGymAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Soft delete the gym
    const { data, error } = await supabase
      .from('gyms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', gymId)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Gym not found or already deleted.' };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Delete Gym Error:', error);
    return {
      success: false,
      error: `Failed to delete gym: ${error.message}`,
    };
  }
}

export async function getGymByIdAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get Gym Error:', error);
    return {
      success: false,
      error: `Failed to get gym: ${error.message}`,
    };
  }
}

export async function getGymByInviteCodeAction(inviteCode) {
  const supabase = await createSupabaseClient();

  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('id, name, description, logo_url, owner_id')
      .eq('invite_code', inviteCode.toUpperCase())
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Invalid invite code.' };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Get Gym by Invite Code Error:', error);
    return {
      success: false,
      error: `Failed to find gym: ${error.message}`,
    };
  }
}

export async function regenerateInviteCodeAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const newInviteCode = generateInviteCode();

    const { data, error } = await supabase
      .from('gyms')
      .update({
        invite_code: newInviteCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gymId)
      .eq('owner_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Regenerate Invite Code Error:', error);
    return {
      success: false,
      error: `Failed to regenerate invite code: ${error.message}`,
    };
  }
}

// ============================================
// MEMBERSHIP OPERATIONS
// ============================================

export async function joinGymAction(inviteCode) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Find gym by invite code
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, name, require_approval')
      .eq('invite_code', inviteCode.toUpperCase())
      .is('deleted_at', null)
      .single();

    if (gymError) {
      if (gymError.code === 'PGRST116') {
        return { success: false, error: 'Invalid invite code.' };
      }
      throw gymError;
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('gym_memberships')
      .select('id, status')
      .eq('gym_id', gym.id)
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      if (existingMembership.status === 'active') {
        return { success: false, error: 'You are already a member of this gym.' };
      }
      if (existingMembership.status === 'pending') {
        return { success: false, error: 'Your membership request is pending approval.' };
      }
      // If status is 'left' or 'suspended', allow rejoining
    }

    // Create membership
    const membershipData = {
      gym_id: gym.id,
      user_id: user.id,
      role: 'athlete',
      status: gym.require_approval ? 'pending' : 'active',
      joined_at: gym.require_approval ? null : new Date().toISOString(),
    };

    const { data: membership, error: membershipError } = await supabase
      .from('gym_memberships')
      .upsert([membershipData], { onConflict: 'gym_id,user_id' })
      .select()
      .single();

    if (membershipError) throw membershipError;

    return {
      success: true,
      data: membership,
      message: gym.require_approval
        ? 'Membership request sent. Waiting for approval.'
        : `Welcome to ${gym.name}!`,
    };
  } catch (error) {
    console.error('Join Gym Error:', error);
    return {
      success: false,
      error: `Failed to join gym: ${error.message}`,
    };
  }
}

export async function leaveGymAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('gym_memberships')
      .update({
        status: 'left',
        updated_at: new Date().toISOString(),
      })
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .neq('role', 'owner') // Owners can't leave their own gym
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Membership not found or you are the owner.' };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Leave Gym Error:', error);
    return {
      success: false,
      error: `Failed to leave gym: ${error.message}`,
    };
  }
}

export async function approveMembershipAction(membershipId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Get the membership and verify the user is the gym owner
    const { data: membership, error: fetchError } = await supabase
      .from('gym_memberships')
      .select('*, gym:gyms(owner_id)')
      .eq('id', membershipId)
      .single();

    if (fetchError) throw fetchError;

    if (membership.gym.owner_id !== user.id) {
      return { success: false, error: 'Only the gym owner can approve memberships.' };
    }

    const { data, error } = await supabase
      .from('gym_memberships')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Approve Membership Error:', error);
    return {
      success: false,
      error: `Failed to approve membership: ${error.message}`,
    };
  }
}

export async function rejectMembershipAction(membershipId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Get the membership and verify the user is the gym owner
    const { data: membership, error: fetchError } = await supabase
      .from('gym_memberships')
      .select('*, gym:gyms(owner_id)')
      .eq('id', membershipId)
      .single();

    if (fetchError) throw fetchError;

    if (membership.gym.owner_id !== user.id) {
      return { success: false, error: 'Only the gym owner can reject memberships.' };
    }

    // Delete the pending membership
    const { error } = await supabase
      .from('gym_memberships')
      .delete()
      .eq('id', membershipId)
      .eq('status', 'pending');

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Reject Membership Error:', error);
    return {
      success: false,
      error: `Failed to reject membership: ${error.message}`,
    };
  }
}

export async function updateMemberClassAction(membershipId, classId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Get the membership and verify the user is the gym owner
    const { data: membership, error: fetchError } = await supabase
      .from('gym_memberships')
      .select('*, gym:gyms(owner_id)')
      .eq('id', membershipId)
      .single();

    if (fetchError) throw fetchError;

    if (membership.gym.owner_id !== user.id) {
      return { success: false, error: 'Only the gym owner can assign classes.' };
    }

    const { data, error } = await supabase
      .from('gym_memberships')
      .update({
        class_id: classId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Update Member Class Error:', error);
    return {
      success: false,
      error: `Failed to update member class: ${error.message}`,
    };
  }
}

export async function getGymMembersAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('gym_memberships')
      .select(`
        id, role, status, joined_at, nickname, class_id,
        user:profiles (
          id, display_name, full_name, profile_photo_url, role
        ),
        class:entities (
          id, name
        )
      `)
      .eq('gym_id', gymId)
      .neq('status', 'left')
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get Gym Members Error:', error);
    return {
      success: false,
      error: `Failed to get gym members: ${error.message}`,
    };
  }
}

export async function getPendingMembersAction(gymId) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('gym_memberships')
      .select(`
        id, role, status, created_at,
        user:profiles (
          id, display_name, full_name, profile_photo_url
        )
      `)
      .eq('gym_id', gymId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Get Pending Members Error:', error);
    return {
      success: false,
      error: `Failed to get pending members: ${error.message}`,
    };
  }
}
