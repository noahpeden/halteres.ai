'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import useProgramStore from '../../store/programStore';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';
import equipmentList from '@/utils/equipmentList';
import {
  Search,
  Sparkles,
  Globe,
  FileText,
  CheckCircle2,
  Eye,
  Trash2,
  ExternalLink,
  Loader2,
  Info,
  ChevronRight,
  ChevronLeft,
  Brain,
  Zap,
  Target,
  X,
} from 'lucide-react';
import {
  goals,
  difficulties,
  gymEquipmentPresets,
} from '../../components/utils';

export default function Step3Page() {
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const programId = searchParams.get('programId');
  
  const wizardData = useProgramStore((state) => state.wizardData);
  const updateWizardData = useProgramStore((state) => state.updateWizardData);
  const goToNext = useProgramStore((state) => state.goToNext);
  const goToPrevious = useProgramStore((state) => state.goToPrevious);
  const fetchProgramFromDatabase = useProgramStore((state) => state.fetchProgramFromDatabase);
  const [previousWorkout, setPreviousWorkout] = useState(
    wizardData.previousWorkout || ''
  );
  const [selectedWorkouts, setSelectedWorkouts] = useState(
    wizardData.selectedWorkouts || []
  );
  const [skipReason, setSkipReason] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCriteria, setSearchCriteria] = useState({
    goal: 'strength',
    difficulty: 'intermediate',
    focusArea: '',
    duration: '60',
    equipment: [],
    workoutFormats: [],
    gymType: 'Commercial Gym',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedWorkoutModal, setSelectedWorkoutModal] = useState(null);
  const [activeTab, setActiveTab] = useState('ai'); // 'manual' or 'ai'
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to create unique workout identifier
  const getWorkoutId = (workout) => {
    return `${workout.title || 'untitled'}-${workout.source || 'unknown'}`;
  };

  // Fetch program data if programId is provided
  useEffect(() => {
    async function loadProgram() {
      if (programId && supabase) {
        setIsLoading(true);
        try {
          const programData = await fetchProgramFromDatabase(programId, supabase);
          if (programData) {
            // Update local state with fetched data
            setPreviousWorkout(programData.personalization || programData.referenceInput || '');
            // Note: selectedWorkouts might need to be loaded from referenceWorkouts if stored
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
    setPreviousWorkout(wizardData.previousWorkout || '');
    setSelectedWorkouts(wizardData.selectedWorkouts || []);
  }, [wizardData.previousWorkout, wizardData.selectedWorkouts]);

  // Save state when fields change
  useEffect(() => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      selectedWorkouts: selectedWorkouts,
    });
  }, [previousWorkout, selectedWorkouts, updateWizardData]);

  useEffect(() => {
    if (searchCriteria.gymType) {
      setSearchCriteria((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[searchCriteria.gymType] || [],
      }));
    }
  }, [searchCriteria.gymType]);

  const handleNext = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      selectedWorkouts: selectedWorkouts,
    });
    goToNext(3);
  };

  const handlePrevious = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      selectedWorkouts: selectedWorkouts,
    });
    goToPrevious(3);
  };

  const handleSkip = () => {
    updateWizardData({
      previousWorkout: '',
      selectedWorkouts: [],
    });
    goToNext(3);
  };

  const handleSearchWorkouts = async () => {
    setSearchLoading(true);
    setSearchResults([]);
    setErrorMessage('');

    try {
      const response = await fetch('/api/web-search-workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: searchQuery,
          goal: searchCriteria.goal,
          difficulty: searchCriteria.difficulty,
          focusArea: searchCriteria.focusArea,
          duration: searchCriteria.duration,
          equipment: searchCriteria.equipment,
          workoutFormats: searchCriteria.workoutFormats,
          gymType: searchCriteria.gymType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search for workouts');
      }

      const data = await response.json();
      setSearchResults(data.workouts || []);
    } catch (error) {
      console.error('Error searching workouts:', error);
      setErrorMessage('Failed to search for workouts. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectWorkout = (workout) => {
    const workoutId = getWorkoutId(workout);
    const isSelected = selectedWorkouts.some(
      (w) => getWorkoutId(w) === workoutId
    );

    if (isSelected) {
      setSelectedWorkouts((prev) =>
        prev.filter((w) => getWorkoutId(w) !== workoutId)
      );
    } else {
      setSelectedWorkouts((prev) => [...prev, workout]);
    }
  };

  const handleRemoveSelectedWorkout = (workoutToRemove) => {
    const workoutId = getWorkoutId(workoutToRemove);
    setSelectedWorkouts((prev) =>
      prev.filter((w) => getWorkoutId(w) !== workoutId)
    );
  };

  const handleViewWorkout = (workout, event) => {
    event.stopPropagation(); // Prevent selection when clicking view
    setSelectedWorkoutModal(workout);
  };

  const closeModal = () => {
    setSelectedWorkoutModal(null);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleCriteriaChange = (field, value) => {
    setSearchCriteria((prev) => ({ ...prev, [field]: value }));
  };

  const exampleWorkouts = [
    `Monday - Upper Body
Bench Press: 4x8 @ 185lbs
Dumbbell Rows: 4x10 @ 60lbs
Overhead Press: 3x8 @ 95lbs
Pull-ups: 3x8
Tricep Extensions: 3x12

Wednesday - Lower Body
Squats: 4x8 @ 225lbs
Romanian Deadlifts: 3x10 @ 185lbs
Leg Press: 3x12
Walking Lunges: 3x10 each leg
Calf Raises: 4x15`,

    `Week 1 - Strength Focus
Day 1: Squat 5x5, Bench 5x5, Rows 4x8
Day 2: Deadlift 5x3, OHP 5x5, Pull-ups 4x6
Day 3: Front Squat 4x6, Incline Bench 4x8, RDL 3x8

Week 2 - Volume
Day 1: Squat 4x8, Bench 4x10, Rows 5x10
Day 2: Deadlift 4x6, OHP 4x8, Lat Pulldown 4x12
Day 3: Leg Press 4x12, DB Press 4x10, Leg Curls 4x12`,
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

      <WizardProgress currentStep={3} />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Personalize Your Program
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Share previous workouts or let our AI agents search the web for
            reference workouts to inspire your custom program
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex justify-center">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-8 py-4 font-medium transition-all relative ${
                activeTab === 'ai'
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span>AI Workout Search</span>
              </div>
              {activeTab === 'ai' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-8 py-4 font-medium transition-all relative ${
                activeTab === 'manual'
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span>Share Previous Workout Programming</span>
              </div>
              {activeTab === 'manual' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Selected Workouts Summary */}
        {selectedWorkouts.length > 0 && (
          <div className="bg-primary/5 border-b border-primary/10 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedWorkouts.length} Reference Workout
                    {selectedWorkouts.length > 1 ? 's' : ''} Selected
                  </p>
                  <p className="text-sm text-gray-600">
                    These will be used to personalize your program
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkouts([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        <div className="p-8">
          {activeTab === 'manual' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-2">
                  Share Your Recent Training
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Paste or describe your recent workouts to help create a more
                  personalized program
                </p>
                <textarea
                  value={previousWorkout}
                  onChange={(e) => setPreviousWorkout(e.target.value)}
                  placeholder="Paste or describe your recent workouts, previous program, or training history. Include exercises, sets, reps, and weights if possible..."
                  className="w-full h-64 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />

                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Example formats:
                  </p>
                  <div className="grid gap-3">
                    {exampleWorkouts.map((workout, index) => (
                      <button
                        key={index}
                        onClick={() => setPreviousWorkout(workout)}
                        className="text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-mono text-gray-600 whitespace-pre-wrap line-clamp-3">
                            {workout}
                          </p>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary mt-1 ml-2 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Why share previous workouts?
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>
                        • Ensures appropriate progression from your current
                        level
                      </li>
                      <li>
                        • Maintains familiar exercise patterns while introducing
                        new ones
                      </li>
                      <li>
                        • Helps identify strengths and areas for improvement
                      </li>
                      <li>
                        • Creates a more personalized and effective program
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Search Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  AI-Powered Workout Discovery
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our AI agents search across the web to find workouts that
                  match your specific needs and preferences
                </p>
              </div>

              {/* Search Form */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What are you looking for?
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., 'CrossFit WOD', 'push pull legs', 'HIIT workout', '5/3/1 program'"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goal
                    </label>
                    <select
                      value={searchCriteria.goal}
                      onChange={(e) =>
                        handleCriteriaChange('goal', e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {goals.map((goal) => (
                        <option key={goal.value} value={goal.value}>
                          {goal.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={searchCriteria.difficulty}
                      onChange={(e) =>
                        handleCriteriaChange('difficulty', e.target.value)
                      }
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {difficulties.map((diff) => (
                        <option key={diff.value} value={diff.value}>
                          {diff.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSearchWorkouts}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {searchLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>AI Agents Searching Web...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Globe className="w-5 h-5" />
                      <span>Search for Workouts</span>
                    </div>
                  )}
                </button>
              </div>

              {/* AI Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-200/50 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900">
                        Web-Wide Search
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Searches across fitness websites and forums
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-200/50 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-purple-900">
                        Smart Matching
                      </h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Finds workouts that match your criteria
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-200/50 rounded-lg">
                      <Target className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900">
                        Personalized Results
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Tailored to your goals and equipment
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{errorMessage}</p>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Found {searchResults.length} Workouts
                  </h4>
                  <div className="grid gap-4">
                    {searchResults.map((workout) => {
                      const workoutId = getWorkoutId(workout);
                      const isSelected = selectedWorkouts.some(
                        (w) => getWorkoutId(w) === workoutId
                      );

                      return (
                        <div
                          key={workoutId}
                          className={`relative bg-white border-2 rounded-xl p-6 transition-all ${
                            isSelected
                              ? 'border-primary shadow-lg shadow-primary/10'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          {/* Selection Badge */}
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 p-2 bg-primary rounded-full">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h5 className="font-semibold text-lg text-gray-900 mb-2">
                                {workout.title}
                              </h5>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {workout.body || workout.description || ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              {isValidUrl(workout.source) ? (
                                <a
                                  href={workout.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  View Source
                                </a>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  Source: {workout.source || 'Web Search'}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => handleViewWorkout(workout, e)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSelectWorkout(workout)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                  isSelected
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-primary hover:bg-primary-dark text-white'
                                }`}
                              >
                                {isSelected ? 'Remove' : 'Select'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Workouts Display */}
          {selectedWorkouts.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">
                Selected Reference Workouts
              </h4>
              <div className="grid gap-3">
                {selectedWorkouts.map((workout) => (
                  <div
                    key={getWorkoutId(workout)}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {workout.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {workout.source || 'Web Search'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleViewWorkout(workout, e)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveSelectedWorkout(workout)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Option */}
          {!previousWorkout && selectedWorkouts.length === 0 && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">
                No previous workouts to share?
              </h3>
              <p className="text-gray-600 mb-4">
                That's okay! Select a reason to continue:
              </p>
              <div className="space-y-3">
                <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="skip-reason"
                    value="beginner"
                    checked={skipReason === 'beginner'}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="mr-3"
                  />
                  <span>New to fitness or returning after a long break</span>
                </label>
                <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="skip-reason"
                    value="no-records"
                    checked={skipReason === 'no-records'}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="mr-3"
                  />
                  <span>Don't have records of previous workouts</span>
                </label>
                <label className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="skip-reason"
                    value="fresh-start"
                    checked={skipReason === 'fresh-start'}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="mr-3"
                  />
                  <span>Want a completely fresh start</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="text-sm text-gray-500">Step 3 of 5</div>

            <div className="flex items-center gap-3">
              {!previousWorkout && selectedWorkouts.length === 0 && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={!skipReason}
                >
                  Skip This Step
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Detail Modal */}
      {selectedWorkoutModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedWorkoutModal.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    {isValidUrl(selectedWorkoutModal.source) ? (
                      <a
                        href={selectedWorkoutModal.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Original Source
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {selectedWorkoutModal.source || 'Web Search'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="whitespace-pre-wrap text-gray-700">
                {selectedWorkoutModal.body ||
                  selectedWorkoutModal.description ||
                  'No workout details available.'}
              </div>
            </div>

            <div className="border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => {
                  handleSelectWorkout(selectedWorkoutModal);
                  closeModal();
                }}
                className={`flex-1 py-2.5 font-medium rounded-lg transition-colors ${
                  selectedWorkouts.some(
                    (w) =>
                      getWorkoutId(w) === getWorkoutId(selectedWorkoutModal)
                  )
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-primary hover:bg-primary-dark text-white'
                }`}
              >
                {selectedWorkouts.some(
                  (w) => getWorkoutId(w) === getWorkoutId(selectedWorkoutModal)
                )
                  ? 'Remove from Selection'
                  : 'Add to Selection'}
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
