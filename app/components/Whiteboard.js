'use client';
import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useRouter } from 'next/navigation'; // Corrected from 'next/navigation'

export default function Whiteboard() {
  const { addWhiteboardInfo } = useOfficeContext();
  const [workoutFormat, setWorkoutFormat] = useState(
    'Crossfit Classes: Warmup, Strength, Metcon, Cool Down, Mobility | Olympic Lifting: Warmup, Strength, Cool Down'
  );
  const [cycleLength, setCycleLength] = useState('Crossfit Classes: 1 week');
  const [focus, setFocus] = useState('Squat, Deadlift, Bench, outside cardio');
  const [exampleWorkout, setExampleWorkout] = useState(
    'Warm up: Hip halo into goblet squat, Strength: 5x5 Back Squat, Metcon: 21-15-9 Wall Balls, Burpees, Cool Down: 5 min bike, Mobility: Couch Stretch'
  );

  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    addWhiteboardInfo({ cycleLength, workoutFormat, focus, exampleWorkout });
    document.getElementById('metcon').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto my-6">
      <h1 className="text-2xl font-bold">Whiteboard</h1>

      <div className="my-4">
        <h2 className="text-xl">Workout Format</h2>
        <textarea
          className="textarea textarea-bordered w-full h-32"
          value={workoutFormat}
          onChange={(e) => setWorkoutFormat(e.target.value)}
        />
      </div>

      <div className="my-4">
        <h2 className="text-xl">Cycle Length</h2>
        <textarea
          className="textarea textarea-bordered w-full h-32"
          value={cycleLength}
          onChange={(e) => setCycleLength(e.target.value)}
        />
      </div>

      <div className="my-4">
        <h2 className="text-xl">Focuses</h2>
        <textarea
          className="textarea textarea-bordered w-full h-32"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />
      </div>

      <div className="my-4">
        <h2 className="text-xl">Template Workouts</h2>
        <textarea
          className="textarea textarea-bordered w-full h-32"
          value={exampleWorkout}
          onChange={(e) => setExampleWorkout(e.target.value)}
        />
      </div>

      <button className="btn btn-primary mt-4" onClick={handleSubmit}>
        Next
      </button>
    </div>
  );
}
