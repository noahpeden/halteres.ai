'use client';

import {
  Activity,
  BarChart3,
  Building,
  Dumbbell,
  Flame,
  GitBranch,
  Heart,
  Home,
  Layers,
  Mountain,
  Repeat,
  Scale,
  Target,
  TrendingUp,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

const trainingMethodologies = [
  {
    value: 'crossfit',
    label: 'CrossFit',
    description: 'Varied functional movements at high intensity',
    icon: Flame,
  },
  {
    value: 'bodybuilding',
    label: 'Bodybuilding',
    description: 'Muscle hypertrophy and aesthetic development',
    icon: Dumbbell,
  },
  {
    value: 'powerlifting',
    label: 'Powerlifting',
    description: 'Strength focused on squat, bench, deadlift',
    icon: Scale,
  },
  {
    value: 'functional_fitness',
    label: 'Functional Fitness',
    description: 'Real-life movement preparation',
    icon: Activity,
  },
  {
    value: 'hiit_metabolic',
    label: 'HIIT/Metabolic',
    description: 'High-intensity metabolic conditioning',
    icon: Zap,
  },
  {
    value: 'calisthenics',
    label: 'Calisthenics',
    description: 'Bodyweight exercises and patterns',
    icon: Users,
  },
  {
    value: 'sport',
    label: 'Sport-Specific',
    description: 'Training for athletic performance',
    icon: Target,
  },
  {
    value: 'triathlete',
    label: 'Triathlete',
    description: 'Swimming, cycling, and running endurance',
    icon: Waves,
  },
  {
    value: 'ironman',
    label: 'Ironman',
    description: 'Ultra-endurance triathlon training',
    icon: Mountain,
  },
  {
    value: 'commercial_gym',
    label: 'Commercial Gym',
    description: 'Standard gym equipment fitness',
    icon: Building,
  },
  {
    value: 'minimal_equipment',
    label: 'Minimal Equipment',
    description: 'Limited equipment training',
    icon: Home,
  },
  {
    value: 'balanced_fitness',
    label: 'Balanced Fitness',
    description: 'Well-rounded fitness approach',
    icon: Heart,
  },
];

const periodizationTypes = [
  {
    value: 'linear',
    label: 'Linear Progression',
    description: 'Gradual intensity increase over time',
    icon: TrendingUp,
  },
  {
    value: 'undulating',
    label: 'Undulating Periodization',
    description: 'Varied intensity within weekly cycles',
    icon: BarChart3,
  },
  {
    value: 'block',
    label: 'Block Periodization',
    description: 'Focused training blocks',
    icon: Layers,
  },
  {
    value: 'conjugate',
    label: 'Conjugate Method',
    description: 'Rotating strength emphasis',
    icon: Repeat,
  },
  {
    value: 'concurrent',
    label: 'Concurrent Training',
    description: 'Multiple fitness qualities',
    icon: GitBranch,
  },
];

export default function Step1Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  const [selectedMethodology, setSelectedMethodology] = useState('');
  const [selectedPeriodization, setSelectedPeriodization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initializeFromDatabaseRef = useRef(false);

  // Fetch program data if programId is provided (only once)
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase && !initializeFromDatabaseRef.current) {
        initializeFromDatabaseRef.current = true;
        setIsLoading(true);
        try {
          // Fetch directly from Supabase
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
            // Update local state directly from database (don't touch store to avoid loops)
            setSelectedMethodology(program.training_methodology || '');
            // Try periodization.program_type first, then fallback to program_type
            setSelectedPeriodization(
              program.periodization?.program_type || program.program_type || ''
            );

            // Data is already set in local state from the fetched program
          }
        } catch (error) {
          console.error('Error loading program:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, supabase]);

  const handleNext = async () => {
    if (!selectedMethodology || !selectedPeriodization) {
      alert('Please select both a training methodology and periodization type');
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
          training_methodology: selectedMethodology,
          periodization: {
            program_type: selectedPeriodization,
          },
        })
        .eq('id', programId);

      if (error) {
        console.error('Error updating program:', error);
        alert('Failed to save program data. Please try again.');
        return;
      }

      // Navigate to step 2
      router.push(`/program-wizard/step-2?programId=${programId}`);
    } catch (error) {
      console.error('Error saving step 1:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <WizardProgress currentStep={1} />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      <div className="bg-base-200 rounded-lg p-6 max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">Training Foundation</h2>
          <p className="text-base-content/70">
            Choose your training methodology and progression model
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Training Methodologies */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-primary">Training Methodology</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Choose your primary training approach
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trainingMethodologies.map((method) => {
                const IconComponent = method.icon;
                return (
                  <label
                    key={method.value}
                    className={`card bg-base-100 p-3 cursor-pointer transition-all hover:shadow-md border ${
                      selectedMethodology === method.value
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="methodology"
                      value={method.value}
                      checked={selectedMethodology === method.value}
                      onChange={(e) => setSelectedMethodology(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedMethodology === method.value
                            ? 'bg-primary text-white'
                            : 'bg-base-200 text-base-content'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{method.label}</div>
                        <div className="text-xs text-base-content/60 mt-1">
                          {method.description}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Periodization Types */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-primary">Periodization Model</h3>
            <p className="text-sm text-base-content/70 mb-4">Select your progression structure</p>
            <div className="space-y-3">
              {periodizationTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <label
                    key={type.value}
                    className={`card bg-base-100 p-3 cursor-pointer transition-all hover:shadow-md border ${
                      selectedPeriodization === type.value
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="periodization"
                      value={type.value}
                      checked={selectedPeriodization === type.value}
                      onChange={(e) => setSelectedPeriodization(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          selectedPeriodization === type.value
                            ? 'bg-primary text-white'
                            : 'bg-base-200 text-base-content'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-base-content/60 mt-1">{type.description}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-base-300">
          <div className="text-sm text-base-content/60">Step 1 of 5 • Training Foundation</div>
          <button
            onClick={handleNext}
            className="btn btn-primary px-6"
            disabled={!selectedMethodology || !selectedPeriodization || isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Saving...
              </>
            ) : (
              <>
                Continue to Step 2
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
