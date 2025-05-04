'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createEntityAction(formData) {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  // Get user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Create Entity Error: User not authenticated', userError);
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const { data, error } = await supabase
      .from('entities')
      .insert([
        {
          name: formData.name,
          type: formData.type,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Create Entity Error:', error);
    return {
      success: false,
      error: `Failed to create entity: ${error.message}`,
    };
  }
}

export async function updateEntityAction(entityId, formData) {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  // Get user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Entity Error: User not authenticated', userError);
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Prepare data for update
    const updateData = {
      name: formData.name,
      type: formData.type,
      // Include metrics if provided (they should be in standard units: kg, cm)
      ...(formData.metrics && {
        bench_1rm: formData.metrics.bench_1rm,
        deadlift_1rm: formData.metrics.deadlift_1rm,
        squat_1rm: formData.metrics.squat_1rm,
        mile_time: formData.metrics.mile_time,
        gender: formData.metrics.gender,
        height_cm: formData.metrics.height_cm,
        weight_kg: formData.metrics.weight_kg,
        recovery_score: formData.metrics.recovery_score,
        injury_history: formData.metrics.injury_history,
      }),
    };

    const { data, error } = await supabase
      .from('entities')
      .update(updateData) // Use the combined update data
      .eq('id', entityId)
      .eq('user_id', user.id) // Ensure owner is updating
      .select() // Select all columns to get the updated entity including metrics
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Update Entity Error:', error);
    return {
      success: false,
      error: `Failed to update entity: ${error.message}`,
    };
  }
}

export async function deleteEntityAction(entityId) {
  // Create client directly inside the action
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  // Get user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Delete Entity Error: User not authenticated', userError);
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // 1. Check for associated programs (important security/data integrity check)
    const { count, error: checkError } = await supabase
      .from('programs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', entityId)
      .eq('user_id', user.id);

    if (checkError)
      throw new Error(
        `Failed to check for associated programs: ${checkError.message}`
      );

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete entity because it has ${count} associated program(s). Please delete or reassign the programs first.`,
      };
    }

    // 2. Delete the entity
    const { error: deleteError } = await supabase
      .from('entities')
      .delete()
      .eq('id', entityId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Delete Entity Error:', error);
    return {
      success: false,
      error: `Failed to delete entity: ${error.message}`,
    };
  }
}
