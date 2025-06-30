'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

export default function Step2Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          const { data: program, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .single();

          if (error) {
            console.error('Error fetching program:', error);
            return;
          }

          if (program) {
            // Update local state with fetched data
            setProgramName(program.name || '');
            setProgramDescription(program.description || '');
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadProgram();
  }, [programId, supabase]);

  const validateForm = () => {
    const newErrors = {};

    if (!programName.trim()) {
      newErrors.programName = 'Program name is required';
    }

    if (!programDescription.trim()) {
      newErrors.programDescription = 'Program description is required';
    } else if (programDescription.trim().length < 50) {
      newErrors.programDescription =
        'Please provide a more detailed description (at least 50 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    if (!programId) {
      alert('No program ID found. Please start from the beginning.');
      router.push('/dashboard');
      return;
    }

    setIsSaving(true);
    try {
      // Update program directly in Supabase
      const { error } = await supabase
        .from('programs')
        .update({
          name: programName.trim(),
          description: programDescription.trim(),
        })
        .eq('id', programId);

      if (error) {
        console.error('Error updating program:', error);
        alert('Failed to save program data. Please try again.');
        return;
      }

      // Navigate to step 3
      router.push(`/program-wizard/step-3?programId=${programId}`);
    } catch (error) {
      console.error('Error saving step 2:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = async () => {
    // Save current state before going back
    if (programId && (programName.trim() || programDescription.trim())) {
      try {
        await supabase
          .from('programs')
          .update({
            name: programName.trim(),
            description: programDescription.trim(),
          })
          .eq('id', programId);
      } catch (error) {
        console.error('Error saving before navigation:', error);
      }
    }

    router.push(`/program-wizard/step-1?programId=${programId}`);
  };

  const examplePrompts = [
    'Client is a competitive basketball player looking to enhance explosive power and vertical jump. They have 2 years of strength training experience and need a program focused on plyometrics and Olympic lifts.',
    'Client is an intermediate powerlifter seeking to improve their deadlift and squat numbers. They have 3 years of training experience and need a program emphasizing progressive overload and accessory work.',
    'Client is a former runner transitioning to triathlon. They need a program that builds swim and bike endurance while maintaining running performance. They have excellent cardiovascular fitness but limited strength training experience.',
    'Client is a busy professional looking to improve body composition and overall fitness. They have basic gym experience and need a program that efficiently combines strength training with metabolic conditioning.',
  ];

  return (
    <div className="relative">
      {/* Exit button when there's a programId */}
      {programId && (
        <button
          onClick={() =>
            (window.location.href = `/program/${programId}/writer`)
          }
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <WizardProgress currentStep={2} />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">
            Program Description
          </h2>
          <p className="text-base-content/70">
            Describe your client's goals, needs, and training preferences
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">
                Program Name
              </span>
              <span className="label-text-alt">
                From dashboard - you can edit if needed
              </span>
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., John's Basketball Prep, Sarah's Marathon Training, Mike's Strength Builder"
              className={`input input-bordered w-full ${
                errors.programName ? 'input-error' : ''
              }`}
            />
            {errors.programName && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.programName}
                </span>
              </label>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">
                Client Program Description
              </span>
              <span className="label-text-alt">
                Be specific about their goals, needs, and current status
              </span>
            </label>
            <textarea
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="Describe your client's fitness goals, current fitness level, any limitations or injuries, training preferences, and what you want to help them achieve with this program..."
              className={`textarea textarea-bordered w-full h-40 ${
                errors.programDescription ? 'textarea-error' : ''
              }`}
            />
            {errors.programDescription && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.programDescription}
                </span>
              </label>
            )}

            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Example descriptions:</p>
              <div className="space-y-2">
                {examplePrompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="text-sm p-3 bg-base-100 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setProgramDescription(prompt)}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <div className="font-semibold">
                Tips for effective client descriptions:
              </div>
              <ul className="text-sm mt-1 list-disc list-inside">
                <li>
                  Include client's current fitness level and training experience
                </li>
                <li>
                  Mention specific goals (strength, muscle, endurance, weight
                  loss)
                </li>
                <li>Note any injuries, limitations, or movements to avoid</li>
                <li>Specify their time constraints and training preferences</li>
                <li>
                  Include their motivation and what success looks like to them
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <button onClick={handlePrevious} className="btn btn-outline">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Step 1
          </button>

          <div className="text-sm text-base-content/60">
            Step 2 of 5 • Client Description
          </div>

          <button 
            onClick={handleNext} 
            className="btn btn-primary px-6"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                Continue to Step 3
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
