'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function login(formData) {
  const supabase = await createClient();

  // Get form data
  const email = formData.get('email');
  const password = formData.get('password');

  // Validate inputs
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Handle errors
  if (error) {
    return { error: error.message };
  }

  // Revalidate paths
  revalidatePath('/', 'layout');

  return { success: true, data };
}

export async function signup(formData) {
  const supabase = await createClient();

  // Get form data
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  // Validate inputs
  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  // Attempt signup
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    },
  });

  // Handle errors
  if (error) {
    return { error: error.message };
  }

  // Revalidate paths
  revalidatePath('/', 'layout');

  return {
    success: true,
    data,
    message: 'Registration successful! Please check your email to confirm your account.',
  };
}

export async function resetPassword(formData) {
  const supabase = await createClient();

  // Get form data
  const email = formData.get('email');

  // Validate inputs
  if (!email) {
    return { error: 'Email is required' };
  }

  // Attempt to send reset email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?reset=true`,
  });

  // Handle errors
  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: 'Password reset link sent to your email',
  };
}

export async function updatePassword(formData) {
  const supabase = await createClient();

  // Get form data
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  // Validate inputs
  if (!password) {
    return { error: 'Password is required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  // Attempt to update password
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  // Handle errors
  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: 'Password has been reset successfully! You can now login with your new password.',
  };
}
