'use client';
import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import ProgramLength from './ProgramLength';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

export default function Whiteboard({ setStep }) {
  const { addWhiteboardInfo, setReadyForQuery, whiteboard } =
    useOfficeContext();
  const { user } = useAuth();
  const [workoutFormat, setWorkoutFormat] = useState(
    whiteboard?.workoutFormat ?? ''
  );
  const [personalization, setPersonalization] = useState(
    'Crossfit Coach or Owner'
  );
  const [programLength, setProgramLength] = useState(
    whiteboard?.programLength ?? '1 Day'
  );
  const [focus, setFocus] = useState(whiteboard?.focus ?? '');
  const [exampleWorkout, setExampleWorkout] = useState(
    whiteboard?.exampleWorkout ?? ''
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    addWhiteboardInfo({
      personalization,
      programLength,
      workoutFormat,
      focus,
      exampleWorkout,
    });
    setStep(2);
    setReadyForQuery(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.data.user.id);
    formData.append('fileName', file.name);

    const response = await fetch('/api/Whiteboard', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    console.log(data);
  };

  return (
    <div className="container mx-auto my-6">
      <h1 className="text-2xl font-bold">Program Customization</h1>
      <div className="my-4">
        <h2 className="text-xl">Who is this for?</h2>
        <select
          value={programLength}
          onChange={(e) => setPersonalization(e.target.value)}
          className="select select-bordered w-full max-w-xs"
        >
          <option disabled selected>
            What best describes who is programming this?
          </option>
          {[
            'Crossfit Coach or Owner',
            'Personal Trainer',
            'Physical Therapist',
          ].map((length, index) => (
            <option key={index} value={length}>
              {length}
            </option>
          ))}
        </select>
      </div>
      <div className="my-4">
        <div className="flex items-center justify-around">
          <ProgramLength
            programLength={programLength}
            setProgramLength={setProgramLength}
          />
          <div className="flex flex-col">
            <div className="flex">
              <h2 className="text-xl">Upload Your Workouts</h2>
              <div
                className="ml-[6px] tooltip tooltip-info cursor-pointer"
                data-tip="Coming soon! Upload a PDF, Doc, or other file with your workouts to be used as a reference when generating your program."
              >
                <InformationCircleIcon className="h-6 w-6 text-gray-500" />
              </div>
            </div>
            <input
              type="file"
              className="file-input file-input-bordered file-input-success text-white w-full max-w-xs"
              onChange={handleFileUpload}
              disabled
            />
          </div>
        </div>
      </div>
      <div className="my-4">
        <div className="flex">
          <h2
            className="text-xl"
            data-tip="How would you like to format each workout?"
          >
            Workout Format
          </h2>
          <div
            className="ml-[6px] tooltip tooltip-info cursor-pointer"
            data-tip="Put in your ideal workout format that you'd like your program to follow. For example, Warmup, Strength, Conditioning, Mobility."
          >
            <InformationCircleIcon className="h-6 w-6 text-gray-500" />
          </div>
        </div>
        <input
          className="input input-bordered focus:outline-primary w-full"
          value={workoutFormat}
          onChange={(e) => setWorkoutFormat(e.target.value)}
          placeholder="Warmup, Strength, Metcon, Cool Down, Mobility"
        />
      </div>

      <div className="my-6">
        <div className="flex">
          <h2
            className="text-xl"
            data-tip="Is there anything specific you'd like to focus on for this program?"
          >
            Focuses
          </h2>
          <div
            className="ml-[6px] tooltip tooltip-info cursor-pointer"
            data-tip="Put in any specific focuses you'd like to have in your program. It can be anything from increasing back squat strength to getting ready for the Open"
          >
            <InformationCircleIcon className="h-6 w-6 text-gray-500" />
          </div>
        </div>
        <input
          className="input input-bordered focus:outline-primary w-full"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Cardio endurance, gymnastics, murph prep, etc."
        />
      </div>

      <div className="my-6">
        <div className="flex">
          <h2 className="text-xl">Template Workouts</h2>
          <div
            className="ml-[6px] tooltip tooltip-info cursor-pointer"
            data-tip="If you have favorite workouts you've written or otherwise, paste them in here to be used as a reference when generating your program. Paste in as many as you'd like."
          >
            <InformationCircleIcon className="h-6 w-6 text-gray-500" />
          </div>
        </div>
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
