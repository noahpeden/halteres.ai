'use client';
import { useState, useEffect } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import ProgramLength from './ProgramLength';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { handleWorkoutUpload } from '../actions/workout-upload';
import { upsertWhiteboard } from '../actions/upsertWhiteboard';

export default function Whiteboard({ setStep, params }) {
  const { addWhiteboardInfo, setReadyForQuery, whiteboard } =
    useOfficeContext();
  const { user, supabase } = useAuth();

  const [workoutFormat, setWorkoutFormat] = useState('');
  const [personalization, setPersonalization] = useState(
    'Crossfit Coach or Owner'
  );
  const [programLength, setProgramLength] = useState('1 Day');
  const [focus, setFocus] = useState('');
  const [exampleWorkout, setExampleWorkout] = useState('');
  const [fileValue, setFileValue] = useState(null);

  useEffect(() => {
    async function fetchWhiteboardInfo() {
      const { data, error } = await supabase
        .from('whiteboard')
        .select('*')
        .eq('program_id', params.programId)
        .single();

      if (error) {
        console.error('Error fetching whiteboard data:', error);
      } else {
        const whiteboardInfo = {
          workoutFormat: data.workout_format,
          personalization: data.personalization,
          programLength: data.cycle_length,
          focus: data.focus,
          exampleWorkout: data.references,
          programId: data.program_id,
          userId: data.user_id,
        };
        addWhiteboardInfo(whiteboardInfo);
      }
    }
    fetchWhiteboardInfo();
  }, [params.programId]);

  useEffect(() => {
    if (whiteboard) {
      setWorkoutFormat(whiteboard.workoutFormat || '');
      setPersonalization(
        whiteboard.personalization || 'Crossfit Coach or Owner'
      );
      setProgramLength(whiteboard.programLength || '1 Day');
      setFocus(whiteboard.focus || '');
      setExampleWorkout(whiteboard.exampleWorkout || '');
    }
  }, [whiteboard]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const whiteboardDetails = {
      workoutFormat,
      personalization,
      programLength,
      focus,
      exampleWorkout,
      programId: params.programId,
      userId: user.data.user.id,
      internalWorkoutName: fileValue,
    };
    addWhiteboardInfo(whiteboardDetails);

    try {
      const data = await upsertWhiteboard(whiteboardDetails);
      setStep(1);
      setReadyForQuery(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.data.user.id);
    formData.append('fileName', file.name);
    setFileValue(file.name);

    try {
      const response = await handleWorkoutUpload(formData);
      return response;
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div className="container mx-auto my-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Program Customization</h1>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl mb-2">Who is this for?</h2>
            <select
              value={personalization}
              onChange={(e) => setPersonalization(e.target.value)}
              className="select select-bordered w-full max-w-xs"
            >
              {[
                'Crossfit Coach or Owner',
                'Personal Trainer',
                'Physical Therapist',
              ].map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-xl mb-2 flex items-center">
              Upload Workouts
              <div
                className="ml-2 tooltip tooltip-info"
                data-tip="Upload a PDF, Doc, or other file with your workouts to be used as a reference when generating your program."
              >
                <InformationCircleIcon className="h-5 w-5 text-gray-500" />
              </div>
            </h2>
            <input
              type="file"
              className="file-input file-input-bordered file-input-success text-white w-full max-w-xs"
              onChange={handleFileUpload}
            />
            {fileValue && (
              <div className="mt-2 text-sm text-gray-500">{fileValue}</div>
            )}
          </div>
        </div>

        <ProgramLength
          programLength={programLength}
          setProgramLength={setProgramLength}
        />

        <div>
          <h2 className="text-xl mb-2 flex items-center">
            Workout Format
            <div
              className="ml-2 tooltip tooltip-info"
              data-tip="Put in your ideal workout format that you'd like your program to follow. For example, Warmup, Strength, Conditioning, Mobility."
            >
              <InformationCircleIcon className="h-5 w-5 text-gray-500" />
            </div>
          </h2>
          <input
            className="input input-bordered focus:outline-primary w-full"
            value={workoutFormat}
            onChange={(e) => setWorkoutFormat(e.target.value)}
            placeholder="Warmup, Strength, Metcon, Cool Down, Mobility"
          />
        </div>

        <div>
          <h2 className="text-xl mb-2 flex items-center">
            Focuses
            <div
              className="ml-2 tooltip tooltip-info"
              data-tip="Put in any specific focuses you'd like to have in your program. It can be anything from increasing back squat strength to getting ready for the Open"
            >
              <InformationCircleIcon className="h-5 w-5 text-gray-500" />
            </div>
          </h2>
          <input
            className="input input-bordered focus:outline-primary w-full"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Cardio endurance, gymnastics, murph prep, etc."
          />
        </div>

        <div>
          <h2 className="text-xl mb-2 flex items-center">
            Template Workouts
            <div
              className="ml-2 tooltip tooltip-info"
              data-tip="If you have favorite workouts you've written or otherwise, paste them in here to be used as a reference when generating your program. Paste in as many as you'd like."
            >
              <InformationCircleIcon className="h-5 w-5 text-gray-500" />
            </div>
          </h2>
          <textarea
            className="textarea textarea-bordered focus:outline-primary w-full h-32"
            value={exampleWorkout}
            onChange={(e) => setExampleWorkout(e.target.value)}
            placeholder="7 sets for load: 6 alternating front-rack reverse lunges. Scaling: Each set in today's workout is meant to be heavy relative to each athlete's ability. Adjust the load as needed to maintain proper form and mechanics across all 7 sets. Intermediate option: Same as Rx'd Beginner option: Same as Rx'd'"
          />
        </div>
      </div>

      <button
        className="btn btn-primary text-white mt-6 w-full"
        onClick={handleSubmit}
      >
        Save and Continue
      </button>
    </div>
  );
}
