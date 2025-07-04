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
    // Prepare entity data
    const entityData = {
      name: formData.name,
      type: formData.type,
      user_id: user.id,
    };

    // If creating a client with metrics, include them
    if (formData.type === 'CLIENT' && formData.metrics) {
      Object.assign(entityData, {
        bench_1rm: formData.metrics.bench_1rm,
        deadlift_1rm: formData.metrics.deadlift_1rm,
        squat_1rm: formData.metrics.squat_1rm,
        mile_time: formData.metrics.mile_time,
        gender: formData.metrics.gender,
        height_cm: formData.metrics.height_cm,
        weight_kg: formData.metrics.weight_kg,
        recovery_score: formData.metrics.recovery_score,
        injury_history: formData.metrics.injury_history,
      });
    }

    const { data, error } = await supabase
      .from('entities')
      .insert([entityData])
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
    // Soft delete the entity by setting deleted_at timestamp
    const { data, error: deleteError } = await supabase
      .from('entities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entityId)
      .eq('user_id', user.id)
      .is('deleted_at', null) // Ensure we're not deleting an already deleted entity
      .select()
      .single();

    if (deleteError) {
      // Check if the error is because the entity doesn't exist or is already deleted
      if (deleteError.code === 'PGRST116') {
        return {
          success: false,
          error: 'Entity not found or already deleted.',
        };
      }
      throw deleteError;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Delete Entity Error:', error);
    return {
      success: false,
      error: `Failed to delete entity: ${error.message}`,
    };
  }
}
