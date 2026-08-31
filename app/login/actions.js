'use server';

export async function login() {
  return { error: 'Use Clerk SignIn at /login' };
}

export async function signup() {
  return { error: 'Use Clerk SignUp at /signup' };
}

export async function resetPassword() {
  return { error: 'Use Clerk password reset' };
}

export async function updatePassword() {
  return { error: 'Use Clerk password update' };
}
