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

  // Local state only - no more Zustand
  const [programDescription, setProgramDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load program data from Supabase
  useEffect(() => {
    async function loadProgram() {
      if (!programId || !supabase) return;

      try {
        setIsLoading(true);
        const { data: program, error } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (error) {
          console.error('Error loading program:', error);
          return;
        }

        if (program && program.description) {
          setProgramDescription(program.description);
        }
      } catch (error) {
        console.error('Error loading program data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgram();
  }, [programId, supabase]);

  // Auto-save with debounce
  useEffect(() => {
    if (!programId || !supabase || isLoading || !programDescription.trim())
      return;

    const timeoutId = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('programs')
          .update({ description: programDescription.trim() })
          .eq('id', programId);

        if (error) {
          console.error('Auto-save error:', error);
        } else {
          console.log('Auto-saved step 2 data');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [programDescription, programId, supabase, isLoading]);

  const validate = () => {
    const newErrors = {};
    if (!programDescription.trim()) {
      newErrors.description = 'Program description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    router.push(`/program-wizard/step-3?programId=${programId}`);
  };

  const handlePrevious = () => {
    router.push(`/program-wizard/step-1?programId=${programId}`);
  };

  return (
    <div className="relative">
      <WizardProgress currentStep={2} />

      {/* Exit button */}
      {programId && (
        <button
          onClick={() => router.push(`/program/${programId}/writer`)}
          className="absolute top-4 right-4 btn btn-ghost btn-circle z-10"
          title="Exit wizard and go to program writer"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">
          Step 2: Describe Your Program
        </h2>
        <p className="text-gray-600 mb-6">
          Provide a brief description of your training program goals
        </p>

        <div className="mb-6">
          <label className="block text-lg font-semibold mb-2">
            Program Description <span className="text-red-500">*Required</span>
          </label>
          <textarea
            className={`w-full h-32 border rounded-lg p-3 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Example: First time program for a 20 year old male who is looking to gain muscle mass and improve his overall fitness. Focus on compound movements and progressive overload."
            value={programDescription}
            onChange={(e) => setProgramDescription(e.target.value)}
            disabled={isLoading}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
          <p className="text-gray-500 text-sm mt-2">
            Tip: Be specific about your goals, target audience, and any special
            considerations
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={!programDescription.trim() || isLoading}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
