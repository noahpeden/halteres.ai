import { redirect } from 'next/navigation';

export default function SignupRedirectPage() {
  // Redirect to login with signup tab selected
  redirect('/login?tab=signup');
}

