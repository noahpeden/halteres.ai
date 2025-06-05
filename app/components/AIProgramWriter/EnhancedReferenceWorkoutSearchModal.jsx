'use client';
import { useState, useEffect } from 'react';
import equipmentList from '@/utils/equipmentList';
import {
  goals,
  difficulties,
  focusAreas,
  workoutFormats,
  gymTypes,
  gymEquipmentPresets,
} from '../utils';

export default function EnhancedReferenceWorkoutSearchModal({
  isOpen,
  onClose,
  onSelect,
  selectedWorkouts = [],
  programId,
}) {
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState(null);
  const [localSelectedWorkouts, setLocalSelectedWorkouts] = useState([]);

  // Helper function to create unique workout identifier
  const getWorkoutId = (workout) => {
    return `${workout.title || 'untitled'}-${workout.source || 'unknown'}`;
  };

  useEffect(() => {
    if (searchCriteria.gymType) {
      setSearchCriteria((prev) => ({
        ...prev,
        equipment: gymEquipmentPresets[searchCriteria.gymType] || [],
      }));
    }
  }, [searchCriteria.gymType]);

  useEffect(() => {
    if (isOpen) {
      setLocalSelectedWorkouts([]);
      setSearchResults([]);
      setErrorMessage('');
      setSearchQuery('');
      setExpandedWorkout(null);
    }
  }, [isOpen]);

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
    const isSelected = localSelectedWorkouts.some(w => getWorkoutId(w) === workoutId);
    
    if (isSelected) {
      setLocalSelectedWorkouts(prev => prev.filter(w => getWorkoutId(w) !== workoutId));
    } else {
      setLocalSelectedWorkouts(prev => [...prev, workout]);
    }
  };

  const handleViewWorkout = (workout, event) => {
    event.stopPropagation();
    setExpandedWorkout(expandedWorkout === getWorkoutId(workout) ? null : getWorkoutId(workout));
  };

  const isWorkoutExpanded = (workout) => {
    return expandedWorkout === getWorkoutId(workout);
  };

  const handleCriteriaChange = (field, value) => {
    setSearchCriteria(prev => ({ ...prev, [field]: value }));
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleAddToProgram = () => {
    if (localSelectedWorkouts.length === 0) return;
    onSelect(localSelectedWorkouts);
  };

  if (!isOpen) return null;

  return (
    <>
      <dialog className="modal modal-open" open={isOpen}>
        <div className="modal-box max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">Find Reference Workouts</h3>
            <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Compact Search Form */}
            <div className="bg-base-50 rounded-lg p-3 mb-3">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workouts (e.g., 'Hyrox', 'deadlift workout', 'HIIT')"
                  className="input input-bordered input-sm flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchWorkouts()}
                />
                <select
                  value={searchCriteria.goal}
                  onChange={(e) => handleCriteriaChange('goal', e.target.value)}
                  className="select select-bordered select-sm w-32"
                >
                  {goals.map(goal => (
                    <option key={goal.value} value={goal.value}>{goal.label}</option>
                  ))}
                </select>
                <select
                  value={searchCriteria.difficulty}
                  onChange={(e) => handleCriteriaChange('difficulty', e.target.value)}
                  className="select select-bordered select-sm w-32"
                >
                  {difficulties.map(diff => (
                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={searchCriteria.duration}
                  onChange={(e) => handleCriteriaChange('duration', e.target.value)}
                  className="input input-bordered input-sm w-20"
                  placeholder="60"
                  min="5"
                  max="180"
                />
                <button
                  onClick={handleSearchWorkouts}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="btn btn-primary btn-sm px-6"
                >
                  {searchLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
              
              {errorMessage && (
                <div className="text-error text-sm mt-1">{errorMessage}</div>
              )}
            </div>

            {/* Compact Selected Workouts */}
            {localSelectedWorkouts.length > 0 && (
              <div className="mb-2 p-2 bg-primary/5 border border-primary/20 rounded text-sm">
                <span className="font-medium text-primary">Selected ({localSelectedWorkouts.length}):</span>
                {localSelectedWorkouts.map((workout, index) => (
                  <span key={getWorkoutId(workout)} className="ml-1">
                    {workout.title}{index < localSelectedWorkouts.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Compact Search Results */}
            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((workout, index) => {
                    const workoutId = getWorkoutId(workout);
                    const isSelected = localSelectedWorkouts.some(w => getWorkoutId(w) === workoutId);
                    
                    return (
                      <div
                        key={workoutId}
                        className={`border rounded-lg transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-base-300 hover:border-primary/50'
                        }`}
                      >
                        {/* Compact Card Header */}
                        <div 
                          className="p-3 cursor-pointer flex items-center justify-between"
                          onClick={() => handleSelectWorkout(workout)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                                isSelected 
                                  ? 'bg-primary border-primary text-white' 
                                  : 'border-base-300'
                              }`}>
                                {isSelected && '✓'}
                              </div>
                              <h5 className="font-medium text-sm truncate">{workout.title}</h5>
                            </div>
                            <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
                              {(workout.body || workout.description || '').substring(0, 120)}...
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-2">
                            {isValidUrl(workout.source) && (
                              <a 
                                href={workout.source} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                                title="View Source"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                            <button
                              onClick={(e) => handleViewWorkout(workout, e)}
                              className="text-xs text-base-content/60 hover:text-primary"
                            >
                              {isWorkoutExpanded(workout) ? '△' : '▽'}
                            </button>
                          </div>
                        </div>
                        
                        {/* Expandable Details */}
                        {isWorkoutExpanded(workout) && (
                          <div className="border-t border-base-300 p-3 bg-base-50">
                            <div className="text-xs leading-relaxed text-base-content/80 max-h-32 overflow-y-auto mb-2">
                              {workout.body || workout.description || 'No workout details available.'}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectWorkout(workout);
                                }}
                                className={`btn btn-xs ${
                                  isSelected ? 'btn-error' : 'btn-primary'
                                }`}
                              >
                                {isSelected ? 'Remove' : 'Add'}
                              </button>
                              {isValidUrl(workout.source) && (
                                <a 
                                  href={workout.source} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Source
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddToProgram}
              disabled={localSelectedWorkouts.length === 0}
            >
              Add Selected ({localSelectedWorkouts.length})
            </button>
          </div>
        </div>
      </dialog>

    </>
  );
}