'use client';
import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useRouter } from 'next/navigation';

export default function Whiteboard() {
  const { push } = useRouter();
  const { addWhiteboardInfo, setReadyForQuery } = useOfficeContext();
  const [workoutFormat, setWorkoutFormat] = useState('');
  const [programLength, setProgramLength] = useState('1 Day');
  const [focus, setFocus] = useState('');
  const [exampleWorkout, setExampleWorkout] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    addWhiteboardInfo({ programLength, workoutFormat, focus, exampleWorkout });
    setReadyForQuery(true);
    push('/metcon');
  };

  return (
    <div className="container mx-auto my-6">
      <h1 className="text-2xl font-bold">Program Customization</h1>

      <div className="my-4">
        <h2 className="text-xl">Workout Format</h2>
        <input
          className="input input-bordered focus:outline-primary w-full"
          value={workoutFormat}
          onChange={(e) => setWorkoutFormat(e.target.value)}
          placeholder="Warmup, Strength, Metcon, Cool Down, Mobility"
        />
      </div>

      <div className="my-6">
        <h2 className="text-xl">How long will this program be?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">1 Day</span>
              <input
                type="radio"
                name="programLength"
                className="radio checked:bg-accent"
                checked={programLength === '1 Day'}
                onChange={() => setProgramLength('1 Day')}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">2 Weeks</span>
              <input
                type="radio"
                name="programLength"
                className="radio checked:bg-accent"
                checked={programLength === '2 Weeks'}
                onChange={() => setProgramLength('2 Weeks')}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">4 Weeks</span>
              <input
                type="radio"
                name="programLength"
                className="radio checked:bg-accent"
                checked={programLength === '4 Weeks'}
                onChange={() => setProgramLength('4 Weeks')}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">6 Weeks</span>
              <input
                type="radio"
                name="programLength"
                className="radio checked:bg-accent"
                checked={programLength === '6 Weeks'}
                onChange={() => setProgramLength('6 Weeks')}
              />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">8 Weeks</span>
              <input
                type="radio"
                name="programLength"
                className="radio checked:bg-accent"
                checked={programLength === '8 Weeks'}
                onChange={() => setProgramLength('8 Weeks')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="my-6">
        <h2 className="text-xl">Focuses</h2>
        <input
          className="input input-bordered focus:outline-primary w-full"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Cardio endurance, gymnastics, murph prep, etc."
        />
      </div>

      <div className="my-6">
        <h2 className="text-xl">Template Workouts</h2>
        <textarea
          className="textarea textarea-bordered focus:outline-primary w-full h-32"
          value={exampleWorkout}
          onChange={(e) => setExampleWorkout(e.target.value)}
          placeholder="7 sets for load: 6 alternating front-rack reverse lunges. Scaling: Each set in today’s workout is meant to be heavy relative to each athlete's ability. Adjust the load as needed to maintain proper form and mechanics across all 7 sets. Intermediate option: Same as Rx’d Beginner option: Same as Rx’d'"
        />
      </div>
      <button
        className="btn btn-primary text-white mt-4 w-full"
        onClick={handleSubmit}
      >
        Save and Continue
      </button>
    </div>
  );
}
