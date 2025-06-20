'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dumbbell,
  Target,
  Zap,
  Heart,
  Users,
  Flame,
  Activity,
  Waves,
  Mountain,
  Building,
  Home,
  Scale,
  TrendingUp,
  BarChart3,
  Layers,
  Repeat,
  GitBranch,
  X,
} from 'lucide-react';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

const trainingMethodologies = [
  {
    value: 'crossfit_box',
    label: 'CrossFit',
    description: 'Varied functional movements at high intensity',
    icon: Flame,
  },
  {
    value: 'commercial_gym',
    label: 'Commercial Gym',
    description: 'Traditional gym environment with full equipment',
    icon: Building,
  },
  {
    value: 'home_gym',
    label: 'Home Gym',
    description: 'Personal training space with varied equipment',
    icon: Home,
  },
  {
    value: 'minimal_equipment',
    label: 'Minimal Equipment',
    description: 'Training with limited equipment options',
    icon: Activity,
  },
  {
    value: 'outdoor_space',
    label: 'Outdoor Space',
    description: 'Training in outdoor environments',
    icon: Mountain,
  },
  {
    value: 'powerlifting_gym',
    label: 'Powerlifting Gym',
    description: 'Strength focused on squat, bench, deadlift',
    icon: Scale,
  },
  {
    value: 'olympic_weightlifting_gym',
    label: 'Olympic Weightlifting Gym',
    description: 'Specialized Olympic lifting training',
    icon: BarChart3,
  },
  {
    value: 'bodyweight_only',
    label: 'Bodyweight Only',
    description: 'Training using only bodyweight exercises',
    icon: Users,
  },
  {
    value: 'studio_gym',
    label: 'Studio Gym',
    description: 'Small group training studio environment',
    icon: Building,
  },
  {
    value: 'university_gym',
    label: 'University Gym',
    description: 'Academic fitness facility',
    icon: Building,
  },
  {
    value: 'hotel_gym',
    label: 'Hotel Gym',
    description: 'Limited hotel fitness facility',
    icon: Building,
  },
  {
    value: 'apartment_gym',
    label: 'Apartment Gym',
    description: 'Residential complex fitness center',
    icon: Home,
  },
  {
    value: 'boxing_mma_gym',
    label: 'Boxing/MMA Gym',
    description: 'Combat sports training facility',
    icon: Activity,
  },
  {
    value: 'triathlon_training_facility',
    label: 'Triathlon Training Facility',
    description: 'Multi-sport endurance training',
    icon: Heart,
  },
  {
    value: 'multi_sport_complex',
    label: 'Multi-Sport Complex',
    description: 'Comprehensive sports training facility',
    icon: Target,
  },
];

const periodizationTypes = [
  {
    value: 'linear',
    label: 'Linear Periodization',
    description: 'Progressive overload with gradual intensity increases',
    icon: TrendingUp,
  },
  {
    value: 'undulating',
    label: 'Undulating Periodization',
    description: 'Variable intensity and volume patterns',
    icon: Waves,
  },
  {
    value: 'block',
    label: 'Block Periodization',
    description: 'Focused training blocks with specific adaptations',
    icon: Layers,
  },
  {
    value: 'conjugate',
    label: 'Conjugate Method',
    description: 'Simultaneous development of multiple qualities',
    icon: GitBranch,
  },
  {
    value: 'concurrent',
    label: 'Concurrent Training',
    description: 'Multiple training qualities developed together',
    icon: Repeat,
  },
];

export default function Step1Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');

  // Local state - no more Zustand dependency
  const [selectedMethodology, setSelectedMethodology] =
    useState('hiit_metabolic');
  const [selectedPeriodization, setSelectedPeriodization] = useState('linear');
  const [isLoading, setIsLoading] = useState(false);
  const [programData, setProgramData] = useState(null);
  const initializeFromDatabaseRef = useRef(false);

  // Load program data from Supabase if programId exists
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase && !initializeFromDatabaseRef.current) {
        initializeFromDatabaseRef.current = true;
        setIsLoading(true);
        try {
          const { data: program, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .single();

          if (error) {
            console.error('Error loading program:', error);
            return;
          }

          if (program) {
            setProgramData(program);
            // Update local state from fetched data
            setSelectedMethodology(
              program.training_methodology || 'hiit_metabolic'
            );
            setSelectedPeriodization(
              program.periodization?.program_type || 'linear'
            );
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

  // Auto-save changes to Supabase with debounce
  useEffect(() => {
    if (!programId || !supabase || isLoading) return;

    const timeoutId = setTimeout(async () => {
      try {
        const updates = {
          training_methodology: selectedMethodology,
          periodization: {
            program_type: selectedPeriodization,
          },
        };

        const { error } = await supabase
          .from('programs')
          .update(updates)
          .eq('id', programId);

        if (error) {
          console.error('Auto-save error:', error);
        } else {
          console.log('Auto-saved step 1 data');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    selectedMethodology,
    selectedPeriodization,
    programId,
    supabase,
    isLoading,
  ]);

  const handleNext = () => {
    if (!selectedMethodology || !selectedPeriodization) {
      alert('Please select both a training methodology and periodization type');
      return;
    }

    // Navigate to step 2
    router.push(`/program-wizard/step-2?programId=${programId}`);
  };

  const getSelectedMethodology = () => {
    return trainingMethodologies.find((m) => m.value === selectedMethodology);
  };

  const getSelectedPeriodization = () => {
    return periodizationTypes.find((p) => p.value === selectedPeriodization);
  };

  return (
    <div className="relative">
      <WizardProgress currentStep={1} />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">Step 1: Training Foundation</h2>
        <p className="text-gray-600 mb-6">
          Select your training methodology and periodization approach
        </p>

        {/* Training Foundation Selections - Side by Side */}
        <div className="flex flex-col xl:flex-row gap-8 mb-8">
          {/* Training Methodology Selection */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Training Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {trainingMethodologies.map((methodology) => {
                const IconComponent = methodology.icon;
                const isSelected = selectedMethodology === methodology.value;
                return (
                  <div
                    key={methodology.value}
                    className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedMethodology(methodology.value)}
                  >
                    <div className="text-center">
                      <IconComponent
                        className={`w-6 h-6 mx-auto mb-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      />
                      <h4 className="font-semibold text-xs mb-1">
                        {methodology.label}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {methodology.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Periodization Selection */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Periodization Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {periodizationTypes.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedPeriodization === type.value;
                return (
                  <div
                    key={type.value}
                    className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedPeriodization(type.value)}
                  >
                    <div className="text-center">
                      <IconComponent
                        className={`w-6 h-6 mx-auto mb-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`}
                      />
                      <h4 className="font-semibold text-xs mb-1">
                        {type.label}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {type.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Current Selection Display */}
        {(selectedMethodology || selectedPeriodization) && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-2">Current Selection:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedMethodology && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {getSelectedMethodology()?.label}
                </span>
              )}
              {selectedPeriodization && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {getSelectedPeriodization()?.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={!selectedMethodology || !selectedPeriodization}
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
