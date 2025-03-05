'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import equipmentList from '@/utils/equipmentList';

export default function AIWorkoutSuggestions({ programId, onSelectWorkout }) {
  const { supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    goal: 'strength',
    duration: '60',
    difficulty: 'intermediate',
    equipment: [],
    focusArea: '',
    additionalNotes: '',
  });
  const [error, setError] = useState('');

  const goals = [
    { value: 'strength', label: 'Strength' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'hypertrophy', label: 'Hypertrophy' },
    { value: 'power', label: 'Power' },
    { value: 'skill', label: 'Skill Development' },
    { value: 'conditioning', label: 'Conditioning' },
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'elite', label: 'Elite' },
  ];

  const focusAreas = [
    { value: 'upper_body', label: 'Upper Body' },
    { value: 'lower_body', label: 'Lower Body' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'core', label: 'Core' },
    { value: 'posterior_chain', label: 'Posterior Chain' },
    { value: 'anterior_chain', label: 'Anterior Chain' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEquipmentChange = (e) => {
    const value = parseInt(e.target.value);
    const isChecked = e.target.checked;

    setFormData((prev) => {
      if (isChecked) {
        return {
          ...prev,
          equipment: [...prev.equipment, value],
        };
      } else {
        return {
          ...prev,
          equipment: prev.equipment.filter((item) => item !== value),
        };
      }
    });
  };

  const generateWorkouts = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch program details to get context for AI suggestions
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('program_id', programId)
        .single();

      // Fetch client metrics if available
      const { data: metricsData } = await supabase
        .from('client_metrics')
        .select('*')
        .eq('program_id', programId)
        .single();

      // Call your AI suggestion API
      const response = await fetch('/api/generate-workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programId,
          programDetails: programData,
          clientMetrics: metricsData,
          preferences: formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate workouts');
      }

      const data = await response.json();
      setSuggestions(data.workouts || []);
    } catch (error) {
      console.error('Error generating workouts:', error);
      setError('Failed to generate workouts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkout = (workout) => {
    if (onSelectWorkout) {
      onSelectWorkout(workout);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">AI Workout Generator</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="label">
            <span className="label-text">Training Goal</span>
          </label>
          <select
            className="select select-bordered w-full"
            name="goal"
            value={formData.goal}
            onChange={handleChange}
          >
            {goals.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Workout Duration (minutes)</span>
          </label>
          <input
            type="number"
            className="input input-bordered w-full"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            min="10"
            max="120"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Difficulty Level</span>
          </label>
          <select
            className="select select-bordered w-full"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
          >
            {difficulties.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Focus Area</span>
          </label>
          <select
            className="select select-bordered w-full"
            name="focusArea"
            value={formData.focusArea}
            onChange={handleChange}
          >
            <option value="">Any Focus Area</option>
            {focusAreas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Available Equipment</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
          {equipmentList.map((equipment) => (
            <div key={equipment.value} className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  value={equipment.value}
                  checked={formData.equipment.includes(equipment.value)}
                  onChange={handleEquipmentChange}
                />
                <span className="label-text">{equipment.label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="label">
          <span className="label-text">Additional Notes</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          name="additionalNotes"
          value={formData.additionalNotes}
          onChange={handleChange}
          placeholder="Any specific requirements or constraints..."
          rows="3"
        />
      </div>

      <button
        className="btn btn-primary w-full"
        onClick={generateWorkouts}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Generating Workouts...
          </>
        ) : (
          'Generate Workouts'
        )}
      </button>

      {error && (
        <div className="alert alert-error mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Generated Workouts</h3>
          <div className="space-y-4">
            {suggestions.map((workout, index) => (
              <div
                key={index}
                className="border rounded-md p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => handleSelectWorkout(workout)}
                draggable
                onDragStart={() => handleSelectWorkout(workout)}
              >
                <h4 className="font-medium text-lg">
                  {workout.title || `Workout ${index + 1}`}
                </h4>
                <div className="flex gap-2 my-2">
                  <span className="badge badge-primary">
                    {workout.type || formData.goal}
                  </span>
                  <span className="badge badge-secondary">
                    {workout.duration || formData.duration} min
                  </span>
                  <span className="badge">
                    {workout.difficulty || formData.difficulty}
                  </span>
                </div>
                <div className="mt-2 text-sm whitespace-pre-line">
                  {workout.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
