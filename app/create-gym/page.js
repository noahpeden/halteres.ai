'use client';
import Office from '@/components/Office';
import { AuthProvider } from '@/contexts/AuthContext';

export default function CreateGym() {
  return (
    <div>
      <AuthProvider>
        <Office />
      </AuthProvider>
    </div>
  );
}
