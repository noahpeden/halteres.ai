'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkoutSelection({ programId, onSelectWorkout }) {
  const { supabase } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search for workouts
  const searchWorkouts = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('external_workouts').select('*');

      if (searchQuery) {
        query = query.textSearch('body', searchQuery);
      }

      if (workoutType) {
        query = query.containsAny('tags', [workoutType]);
      }

      // Add time range filter if implemented in your database

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error searching workouts:', error);
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI suggestions
  const getAiSuggestions = async () => {
    setIsLoading(true);
    try {
      // Fetch program details to get context for AI suggestions
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('program_id', programId)
        .single();

      // Call your AI suggestion API
      const response = await fetch('/api/ai-workout-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          programDetails: programData,
          filters: {
            workoutType,
            timeRange,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }

      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fill next 4 weeks
  const autoFillNextFourWeeks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auto-fill-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          weeks: 4,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-fill program');
      }

      // Refresh the calendar or notify the parent component
      if (onSelectWorkout) {
        onSelectWorkout({ action: 'refresh' });
      }
    } catch (error) {
      console.error('Error auto-filling program:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle workout selection
  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      onSelectWorkout(workout);
    }
  };

  useEffect(() => {
    // Initial search when component mounts
    searchWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Workout Selection</h2>

      {/* Search and filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Search workouts..."
            className="input input-bordered flex-grow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={searchWorkouts}
            disabled={isLoading}
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className="select select-bordered"
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value)}
          >
            <option value="">All Workout Types</option>
            <option value="AMRAP">AMRAP</option>
            <option value="EMOM">EMOM</option>
            <option value="For Time">For Time</option>
            <option value="Strength">Strength</option>
            <option value="Skill">Skill</option>
          </select>

          <select
            className="select select-bordered"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="">Any Duration</option>
            <option value="0-10">0-10 minutes</option>
            <option value="10-20">10-20 minutes</option>
            <option value="20-30">20-30 minutes</option>
            <option value="30+">30+ minutes</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={getAiSuggestions}
            disabled={isLoading}
          >
            Get AI Suggestions
          </button>

          <button
            className="btn btn-accent"
            onClick={autoFillNextFourWeeks}
            disabled={isLoading}
          >
            Auto-Fill Next 4 Weeks
          </button>
        </div>
      </div>

      {/* Results section */}
      <div className="space-y-4">
        {aiSuggestions.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">AI Suggestions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSuggestions.map((workout, index) => (
                <div
                  key={`ai-${index}`}
                  className="border rounded-md p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => handleSelectWorkout(workout)}
                  draggable
                  onDragStart={() => handleSelectWorkout(workout)}
                >
                  <div className="font-medium">
                    {workout.title || 'AI Suggested Workout'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {workout.description || workout.body}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-primary">
                      {workout.workout_type || 'Custom'}
                    </span>
                    {workout.time_domain && (
                      <span className="badge badge-secondary">
                        {workout.time_domain}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium mb-2">Search Results</h3>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((workout) => (
                <div
                  key={workout.id}
                  className="border rounded-md p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => handleSelectWorkout(workout)}
                  draggable
                  onDragStart={() => handleSelectWorkout(workout)}
                >
                  <div className="font-medium">
                    {workout.title || 'Untitled Workout'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {workout.body.substring(0, 100)}...
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-primary">
                      {workout.workout_type || 'Custom'}
                    </span>
                    {workout.time_domain && (
                      <span className="badge badge-secondary">
                        {workout.time_domain}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 text-gray-500">
              No workouts found. Try adjusting your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
