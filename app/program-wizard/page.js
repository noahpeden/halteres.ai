'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProgramWizardRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const [status, setStatus] = useState('Initializing wizard...');
  const [error, setError] = useState(null);
  
  // Check if we have an existing programId from URL or should create new
  const existingProgramId = searchParams.get('programId');
  const entityId = searchParams.get('entityId');

  useEffect(() => {
    async function initializeWizard() {
      try {
        if (existingProgramId) {
          // If we have an existing program ID, go directly to step 1 with it
          setStatus('Loading existing program...');
          router.replace(`/program-wizard/step-1?programId=${existingProgramId}`);
          return;
        }

        if (!entityId) {
          // If no entity ID, redirect to dashboard to select entity
          setError('No client selected. Please select a client first.');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
          return;
        }

        if (!supabase) {
          setError('Authentication required. Please log in.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }

        // Create a minimal program immediately
        setStatus('Creating your program...');
        
        // Set default start date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startDate = tomorrow.toISOString().split('T')[0];
        
        // Calculate end date for 4 weeks
        const endDate = new Date(tomorrow);
        endDate.setDate(endDate.getDate() + 4 * 7 - 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const programData = {
          name: 'New Training Program',
          entity_id: entityId,
          duration_weeks: 4,
          description: '',
          training_methodology: 'hiit_metabolic',
          difficulty: 'intermediate',
          focus_area: 'full_body',
          reference_input: '',
          calendar_data: {
            start_date: startDate,
            end_date: endDateStr,
            days_of_week: ['monday', 'wednesday', 'friday'],
          },
          periodization: {
            program_type: 'linear',
          },
          gym_details: {
            gym_type: 'crossfit_box',
            equipment: [],
          },
          workout_format: {
            formats: ['strength', 'hypertrophy', 'endurance'],
          },
          session_details: {
            duration_minutes: 60,
          },
        };

        const { data, error: createError } = await supabase
          .from('programs')
          .insert(programData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating minimal program:', createError);
          throw new Error(`Failed to create program: ${createError.message}`);
        }

        setStatus('Program created! Starting wizard...');
        
        // Small delay for UX, then redirect to step 1 with the program ID
        await new Promise(resolve => setTimeout(resolve, 500));
        router.replace(`/program-wizard/step-1?programId=${data.id}`);
        
      } catch (error) {
        console.error('Error initializing wizard:', error);
        setError(error.message || 'Failed to start wizard');
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    }

    initializeWizard();
  }, [router, existingProgramId, entityId, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <div className="alert alert-error max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Error starting wizard</h3>
              <div className="text-sm">{error}</div>
              <div className="text-xs mt-2">Redirecting...</div>
            </div>
          </div>
        ) : (
          <>
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">{status}</p>
            <p className="text-sm text-base-content/60 mt-2">
              We're setting up your program in the background so nothing gets lost!
            </p>
          </>
        )}
      </div>
    </div>
  );
}