'use client';
import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useRouter } from 'next/navigation';

export default function Whiteboard() {
  const { addWhiteboardInfo, setReadyForQuery } = useOfficeContext();
  const [workoutFormat, setWorkoutFormat] = useState(
    'Crossfit Classes: Warmup, Strength, Metcon, Cool Down, Mobility | Olympic Lifting: Warmup, Strength, Cool Down'
  );
  const [cycleLength, setCycleLength] = useState('Crossfit Classes: 1 week');
  const [focus, setFocus] = useState('Squat, Deadlift, Bench, outside cardio');
  const [exampleWorkout, setExampleWorkout] = useState(
    "7 sets for load: 6 alternating front-rack reverse lunges (3/leg) Post heaviest load to comments. Scaling: Each set in today’s workout is meant to be heavy relative to each athlete's ability. Adjust the load as needed to maintain proper form and mechanics across all 7 sets. Intermediate option: Same as Rx’d Beginner option: Same as Rx’d'"
  );

  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    addWhiteboardInfo({ cycleLength, workoutFormat, focus, exampleWorkout });
    setReadyForQuery(true);
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
