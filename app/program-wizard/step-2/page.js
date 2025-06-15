'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';
import useProgramStore from '../../store/programStore';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

export default function Step2Page() {
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');
  
  const wizardData = useProgramStore((state) => state.wizardData);
  const updateWizardData = useProgramStore((state) => state.updateWizardData);
  const goToNext = useProgramStore((state) => state.goToNext);
  const goToPrevious = useProgramStore((state) => state.goToPrevious);
  const fetchProgramFromDatabase = useProgramStore((state) => state.fetchProgramFromDatabase);
  const [programName, setProgramName] = useState(wizardData.programName || '');
  const [programDescription, setProgramDescription] = useState(wizardData.programDescription || '');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);


  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          const programData = await fetchProgramFromDatabase(programId, supabase);
          if (programData) {
            // Update local state with fetched data
            setProgramName(programData.name || '');
            setProgramDescription(programData.description || '');
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
    
    loadProgram();
  }, [programId, supabase, fetchProgramFromDatabase]);

  useEffect(() => {
    // Set program name from wizard data (from dashboard) or use existing
    setProgramName(wizardData.programName || '');
    setProgramDescription(wizardData.programDescription || '');
  }, [wizardData.programName, wizardData.programDescription]);

  // Save state when fields change
  useEffect(() => {
    if (programName.trim() || programDescription.trim()) {
      updateWizardData({
        programName: programName.trim(),
        programDescription: programDescription.trim(),
      });
    }
  }, [programName, programDescription, updateWizardData]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!programName.trim()) {
      newErrors.programName = 'Program name is required';
    }
    
    if (!programDescription.trim()) {
      newErrors.programDescription = 'Program description is required';
    } else if (programDescription.trim().length < 50) {
      newErrors.programDescription = 'Please provide a more detailed description (at least 50 characters)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) {
      return;
    }
    
    updateWizardData({
      programName: programName.trim(),
      programDescription: programDescription.trim(),
    });
    goToNext(2);
  };

  const handlePrevious = () => {
    updateWizardData({
      programName: programName.trim(),
      programDescription: programDescription.trim(),
    });
    goToPrevious(2);
  };

  const examplePrompts = [
    "Client wants to improve overall strength and conditioning for basketball season. Focus on explosive power, endurance, and injury prevention. They train 4x/week and have experience with compound movements.",
    "Help client build muscle mass while maintaining functional fitness. Intermediate lifter looking to add 10-15 lbs of lean muscle over 12 weeks. Prefers upper/lower split.",
    "Client is training for their first triathlon (sprint distance) and needs a balanced program that includes strength work to support endurance training. New to triathlon but has running background.",
    "Design a program to help client lose 20 lbs while building strength. They have limited time (45 min/day), access to a commercial gym, and prefer full-body workouts.",
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
          <h2 className="text-2xl font-bold text-primary mb-2">Program Description</h2>
          <p className="text-base-content/70">Describe your client's goals, needs, and training preferences</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">Program Name</span>
              <span className="label-text-alt">From dashboard - you can edit if needed</span>
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., John's Basketball Prep, Sarah's Marathon Training, Mike's Strength Builder"
              className={`input input-bordered w-full ${errors.programName ? 'input-error' : ''} ${wizardData.programName ? 'bg-primary/5' : ''}`}
            />
            {wizardData.programName && (
              <label className="label">
                <span className="label-text-alt text-success">✓ Pre-filled from dashboard</span>
              </label>
            )}
            {errors.programName && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.programName}</span>
              </label>
            )}
          </div>

          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">Client Program Description</span>
              <span className="label-text-alt">Be specific about their goals, needs, and current status</span>
            </label>
            <textarea
              value={programDescription}
              onChange={(e) => setProgramDescription(e.target.value)}
              placeholder="Describe your client's fitness goals, current fitness level, any limitations or injuries, training preferences, and what you want to help them achieve with this program..."
              className={`textarea textarea-bordered w-full h-40 ${errors.programDescription ? 'textarea-error' : ''}`}
            />
            {errors.programDescription && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.programDescription}</span>
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <div className="font-semibold">Tips for effective client descriptions:</div>
              <ul className="text-sm mt-1 list-disc list-inside">
                <li>Include client's current fitness level and training experience</li>
                <li>Mention specific goals (strength, muscle, endurance, weight loss)</li>
                <li>Note any injuries, limitations, or movements to avoid</li>
                <li>Specify their time constraints and training preferences</li>
                <li>Include their motivation and what success looks like to them</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <button
            onClick={handlePrevious}
            className="btn btn-outline"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Step 1
          </button>
          
          <div className="text-sm text-base-content/60">
            Step 2 of 5 • Client Description
          </div>
          
          <button
            onClick={handleNext}
            className="btn btn-primary px-6"
          >
            Continue to Step 3
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}