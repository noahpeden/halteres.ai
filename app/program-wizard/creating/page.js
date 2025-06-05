'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function CreatingProgramPage() {
  const router = useRouter();
  const { supabase } = useAuth();
  const [status, setStatus] = useState('Creating your program...');
  const [error, setError] = useState(null);
  const hasCreated = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasCreated.current) return;
    
    async function createAndRedirect() {
      hasCreated.current = true; // Mark as started immediately
      
      const wizardData = sessionStorage.getItem('programWizardData');
      if (!wizardData) {
        setError('No wizard data found');
        router.push('/dashboard');
        return;
      }
      
      // Clear session data immediately to prevent reuse
      sessionStorage.removeItem('programWizardData');

      try {
        const data = JSON.parse(wizardData);
        
        // Validate required data
        if (!data.startDate || !data.numberOfWeeks) {
          throw new Error('Missing required scheduling data');
        }
        
        // Calculate end date with validation
        const startDate = new Date(data.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid start date');
        }
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (parseInt(data.numberOfWeeks) * 7) - 1);
        
        setStatus('Setting up your program structure...');
        
        // Format dates properly
        const formattedStartDate = typeof data.startDate === 'string' 
          ? data.startDate 
          : startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        console.log('Creating program with dates:', {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          numberOfWeeks: data.numberOfWeeks
        });
        
        // Create the program with all wizard data
        const createResponse = await fetch('/api/CreateProgram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.programName || 'New Program',
            entity_id: data.entityId,
            duration_weeks: parseInt(data.numberOfWeeks) || 4,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            days_of_week: data.daysOfWeek || ['monday', 'wednesday', 'friday'],
            description: data.programDescription,
            training_methodology: data.trainingMethodology,
            difficulty: data.difficulty,
            focus_area: data.focusArea,
            gym_type: data.gymType,
            equipment: data.equipment || [],
            workout_formats: data.workoutFormats || [],
            reference_input: data.referenceInput,
            program_type: data.programType,
            workout_duration: data.workoutDuration,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || 'Failed to create program');
        }

        const result = await createResponse.json();
        const program = result.data[0];

        setStatus('Preparing AI generation...');
        
        // Update wizard data with program ID
        const wizardDataForWriter = {
          ...data,
          programId: program.id
        };
        sessionStorage.setItem('programWizardData', JSON.stringify(wizardDataForWriter));

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to the program writer
        router.push(`/program/${program.id}/writer?wizardComplete=true`);
      } catch (error) {
        console.error('Error creating program:', error);
        setError(error.message);
        
        // Redirect to dashboard after showing error
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      }
    }

    createAndRedirect();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Creating Your Program
          </h1>
          <p className="text-lg text-base-content/70">
            We're setting up your personalized training program...
          </p>
        </div>
        
        {error ? (
          <div className="alert alert-error max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Error creating program</h3>
              <div className="text-sm">{error}</div>
              <div className="text-xs mt-2">Redirecting to dashboard...</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3">
                <span className={`loading loading-dots loading-sm ${status.includes('structure') ? 'text-primary' : 'text-base-content/30'}`}></span>
                <span className={status.includes('structure') ? 'text-primary font-semibold' : 'text-base-content/50'}>
                  Program Structure
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <span className={`loading loading-dots loading-sm ${status.includes('AI') ? 'text-primary' : 'text-base-content/30'}`}></span>
                <span className={status.includes('AI') ? 'text-primary font-semibold' : 'text-base-content/50'}>
                  AI Generation Setup
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <span className="loading loading-dots loading-sm text-base-content/30"></span>
                <span className="text-base-content/50">
                  Week-by-Week Generation
                </span>
              </div>
            </div>
            
            <p className="text-sm text-base-content/60 mt-8">
              {status}
            </p>
          </>
        )}
      </div>
    </div>
  );
}