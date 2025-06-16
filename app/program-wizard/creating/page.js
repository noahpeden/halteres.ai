'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import useProgramStore from '@/store/programStore';

export default function CreatingProgramPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingProgramId = searchParams.get('programId');
  const { supabase } = useAuth();
  const [status, setStatus] = useState('Creating your program...');
  const [error, setError] = useState(null);
  const hasCreated = useRef(false);
  
  // Get form data and actions from Zustand store
  const formData = useProgramStore((state) => state.formData);
  const entityName = useProgramStore((state) => state.entityName);
  const entityType = useProgramStore((state) => state.entityType);
  const clearProgramState = useProgramStore((state) => state.clearProgramState);
  const setProgramId = useProgramStore((state) => state.setProgramId);

  useEffect(() => {
    // Prevent multiple executions
    if (hasCreated.current) return;
    
    async function createAndRedirect() {
      hasCreated.current = true; // Mark as started immediately
      
      // For existing programs, we can proceed even if formData is incomplete
      // since we'll fetch the data from the database
      if (!existingProgramId && (!formData || !formData.entityId)) {
        setError('No program data found for new program creation');
        router.push('/dashboard');
        return;
      }

      try {
        let programId = existingProgramId;
        let effectiveFormData = formData;
        
        // If updating an existing program and form data is incomplete, fetch existing data
        if (existingProgramId && (!formData || !formData.startDate || !formData.numberOfWeeks)) {
          setStatus('Fetching existing program data...');
          
          const { data: existingProgram, error: fetchError } = await supabase
            .from('programs')
            .select('*')
            .eq('id', existingProgramId)
            .single();
            
          if (fetchError) {
            throw new Error(`Failed to fetch existing program: ${fetchError.message}`);
          }
          
          // Merge existing data with form data
          effectiveFormData = {
            ...formData,
            name: formData.name || existingProgram.name || 'Updated Program',
            entityId: formData.entityId || existingProgram.entity_id,
            startDate: formData.startDate || existingProgram.start_date,
            numberOfWeeks: formData.numberOfWeeks || String(existingProgram.duration_weeks) || '4',
            daysOfWeek: formData.daysOfWeek || existingProgram.days_of_week || ['Monday', 'Wednesday', 'Friday'],
            description: formData.description || existingProgram.description || '',
            trainingMethodology: formData.trainingMethodology || existingProgram.training_methodology || '',
            difficulty: formData.difficulty || existingProgram.difficulty || 'intermediate',
            focusArea: formData.focusArea || existingProgram.focus_area || 'full_body',
            gymType: formData.gymType || existingProgram.gym_type || 'Crossfit Box',
            equipment: formData.equipment || existingProgram.equipment || [],
            workoutFormats: formData.workoutFormats || existingProgram.workout_formats || [],
            referenceInput: formData.referenceInput || existingProgram.reference_input || '',
            personalization: formData.personalization || existingProgram.personalization || '',
            programType: formData.programType || existingProgram.program_type || 'linear',
            sessionDetails: formData.sessionDetails || existingProgram.session_details || {},
          };
        }
        
        // Validate required data
        if (!effectiveFormData.startDate || !effectiveFormData.numberOfWeeks) {
          throw new Error('Missing required scheduling data');
        }
        
        // Calculate end date with validation
        const startDate = new Date(effectiveFormData.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error('Invalid start date');
        }
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (parseInt(effectiveFormData.numberOfWeeks) * 7) - 1);
        
        // Format dates properly
        const formattedStartDate = typeof effectiveFormData.startDate === 'string' 
          ? effectiveFormData.startDate 
          : startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        // Convert gym type from Title Case to snake_case for database storage
        const dbGymType = effectiveFormData.gymType 
          ? effectiveFormData.gymType.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')
          : 'crossfit_box';
        
        if (existingProgramId) {
          setStatus('Updating your program...');
          
          // Update existing program
          const updateResponse = await fetch(`/api/programs/${existingProgramId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: effectiveFormData.name || 'Updated Program',
              entity_id: effectiveFormData.entityId,
              duration_weeks: parseInt(effectiveFormData.numberOfWeeks) || 4,
              start_date: formattedStartDate,
              end_date: formattedEndDate,
              days_of_week: effectiveFormData.daysOfWeek?.map(day => day.toLowerCase()) || ['monday', 'wednesday', 'friday'],
              description: effectiveFormData.description,
              training_methodology: effectiveFormData.trainingMethodology,
              difficulty: effectiveFormData.difficulty,
              focus_area: effectiveFormData.focusArea,
              gym_type: dbGymType,
              equipment: effectiveFormData.equipment || [],
              workout_formats: effectiveFormData.workoutFormats || [],
              reference_input: effectiveFormData.referenceInput,
              personalization: effectiveFormData.personalization,
              program_type: effectiveFormData.programType,
              session_details: effectiveFormData.sessionDetails,
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || 'Failed to update program');
          }
        } else {
          setStatus('Setting up your program structure...');
          
          console.log('Creating program with dates:', {
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            numberOfWeeks: effectiveFormData.numberOfWeeks
          });
          
          // Create new program with all wizard data
          const createResponse = await fetch('/api/CreateProgram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name || 'New Program',
              entity_id: formData.entityId,
              duration_weeks: parseInt(formData.numberOfWeeks) || 4,
              start_date: formattedStartDate,
              end_date: formattedEndDate,
              days_of_week: formData.daysOfWeek?.map(day => day.toLowerCase()) || ['monday', 'wednesday', 'friday'],
              description: formData.description,
              training_methodology: formData.trainingMethodology,
              difficulty: formData.difficulty,
              focus_area: formData.focusArea,
              gym_type: formData.gymType,
              equipment: formData.equipment || [],
              workout_formats: formData.workoutFormats || [],
              reference_input: formData.referenceInput,
              personalization: formData.personalization,
              program_type: formData.programType,
              session_details: formData.sessionDetails,
            }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create program');
          }

          const result = await createResponse.json();
          const program = result.data[0];
          programId = program.id;
        }

        setStatus('Preparing AI generation...');
        
        // Update program ID in Zustand store
        setProgramId(programId);

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to the program writer
        router.push(`/program/${programId}/writer?wizardComplete=true`);
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