'use client';

import { useState, useEffect } from 'react';
import { useProgramWizard } from '../../contexts/ProgramWizardContext';
import WizardProgress from '../../components/ProgramWizard/WizardProgress';

export default function Step3Page() {
  const { wizardData, updateWizardData, goToNext, goToPrevious } = useProgramWizard();
  const [previousWorkout, setPreviousWorkout] = useState(wizardData.previousWorkout || '');
  const [referenceInput, setReferenceInput] = useState(wizardData.referenceInput || '');
  const [skipReason, setSkipReason] = useState('');

  useEffect(() => {
    setPreviousWorkout(wizardData.previousWorkout || '');
    setReferenceInput(wizardData.referenceInput || '');
  }, [wizardData.previousWorkout, wizardData.referenceInput]);

  const handleNext = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      referenceInput: referenceInput.trim(),
    });
    goToNext(3);
  };

  const handlePrevious = () => {
    updateWizardData({
      previousWorkout: previousWorkout.trim(),
      referenceInput: referenceInput.trim(),
    });
    goToPrevious(3);
  };

  const handleSkip = () => {
    updateWizardData({
      previousWorkout: '',
      referenceInput: '',
    });
    goToNext(3);
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
    <div>
      <WizardProgress currentStep={3} />
      
      <div className="bg-base-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-primary mb-2">Previous Workouts</h2>
          <p className="text-base-content/70">Share your client's recent training history (optional)</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">Share Your Recent Training</span>
              <span className="label-text-alt">This helps create a more personalized program</span>
            </label>
            <textarea
              value={previousWorkout}
              onChange={(e) => setPreviousWorkout(e.target.value)}
              placeholder="Paste or describe your recent workouts, previous program, or training history. Include exercises, sets, reps, and weights if possible..."
              className="textarea textarea-bordered w-full h-64"
            />
            
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Example formats:</p>
              <div className="space-y-2">
                {exampleWorkouts.map((workout, index) => (
                  <div
                    key={index}
                    className="text-sm p-3 bg-base-100 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors font-mono whitespace-pre-wrap"
                    onClick={() => setPreviousWorkout(workout)}
                  >
                    {workout.substring(0, 150)}...
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="divider">OR</div>

          {/* Reference Input Field */}
          <div>
            <label className="label">
              <span className="label-text text-lg font-medium">Specific Workout Reference</span>
              <span className="label-text-alt">For RAG-based workout generation</span>
            </label>
            <textarea
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              placeholder="Paste a specific workout (e.g., a WOD, specific program structure) that you want the AI to use as a reference for generating similar workouts..."
              className="textarea textarea-bordered w-full h-32"
            />
            
            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-semibold">How this works:</div>
                <div className="text-sm">
                  This field uses Retrieval Augmented Generation (RAG) to find similar workouts in our database and generate new workouts based on that style and structure.
                </div>
              </div>
            </div>
          </div>

          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-bold">Why share previous workouts?</h3>
              <div className="text-sm">
                <ul className="list-disc list-inside mt-1">
                  <li>Ensures appropriate progression from your current level</li>
                  <li>Maintains familiar exercise patterns while introducing new ones</li>
                  <li>Helps identify strengths and areas for improvement</li>
                  <li>Creates a more personalized and effective program</li>
                </ul>
              </div>
            </div>
          </div>

          {!previousWorkout && (
            <div className="card bg-base-100">
              <div className="card-body">
                <h3 className="card-title text-lg">No previous workouts to share?</h3>
                <p className="text-sm">That's okay! You can skip this step if you're:</p>
                <div className="mt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="beginner"
                      checked={skipReason === 'beginner'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">New to fitness or returning after a long break</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer mt-2">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="no-records"
                      checked={skipReason === 'no-records'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">Don't have records of previous workouts</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer mt-2">
                    <input
                      type="radio"
                      name="skip-reason"
                      value="fresh-start"
                      checked={skipReason === 'fresh-start'}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="radio radio-sm"
                    />
                    <span className="text-sm">Want a completely fresh start</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="btn btn-outline"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Description
          </button>
          
          <div className="text-sm text-base-content/60">
            Step 3 of 5 • Previous Workouts
          </div>
          
          <div className="space-x-2">
            {!previousWorkout && !referenceInput && (
              <button
                onClick={handleSkip}
                className="btn btn-ghost"
                disabled={!skipReason}
              >
                Skip This Step
              </button>
            )}
            <button
              onClick={handleNext}
              className="btn btn-primary"
            >
              Continue to Gym Setup
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}