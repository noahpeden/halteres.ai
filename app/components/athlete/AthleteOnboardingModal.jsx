'use client';

import { useState } from 'react';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Your Profile' },
  { id: 'metrics', title: 'Your Metrics' },
  { id: 'complete', title: 'Ready!' },
];

export default function AthleteOnboardingModal({ profile, gymName, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || profile?.full_name || '',
    squat_1rm: profile?.squat_1rm || '',
    deadlift_1rm: profile?.deadlift_1rm || '',
    bench_1rm: profile?.bench_1rm || '',
    mile_time: profile?.mile_time || '',
    weight_kg: profile?.weight_kg || '',
    height_cm: profile?.height_cm || '',
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/athlete/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          onboarding_completed: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onComplete?.();
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (ONBOARDING_STEPS[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🏋️</div>
            <h2 className="text-2xl font-bold mb-2">Welcome to {gymName}!</h2>
            <p className="text-base-content/70 mb-4">
              Let's get you set up so you can start tracking your workouts and crushing your goals.
            </p>
            <div className="space-y-2 text-left bg-base-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold">Here's what you can do:</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  View today's workouts from your coach
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  Log your results and track PRs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  Get AI-powered feedback on your performance
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-success">✓</span>
                  Compete on leaderboards with your gym
                </li>
              </ul>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="py-4">
            <h2 className="text-xl font-bold mb-2">Set Up Your Profile</h2>
            <p className="text-base-content/70 mb-6">
              How would you like to be known in the gym?
            </p>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Display Name</span>
              </label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder="Your name or nickname"
                className="input input-bordered w-full"
              />
              <label className="label">
                <span className="label-text-alt">This is what others will see on the leaderboard</span>
              </label>
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div className="py-4">
            <h2 className="text-xl font-bold mb-2">Your Baseline Metrics</h2>
            <p className="text-base-content/70 mb-4">
              Optional: Add your current PRs to help personalize your experience.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Back Squat 1RM (kg)</span>
                  </label>
                  <input
                    type="number"
                    name="squat_1rm"
                    value={formData.squat_1rm}
                    onChange={handleInputChange}
                    placeholder="e.g. 120"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Deadlift 1RM (kg)</span>
                  </label>
                  <input
                    type="number"
                    name="deadlift_1rm"
                    value={formData.deadlift_1rm}
                    onChange={handleInputChange}
                    placeholder="e.g. 150"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Bench Press 1RM (kg)</span>
                  </label>
                  <input
                    type="number"
                    name="bench_1rm"
                    value={formData.bench_1rm}
                    onChange={handleInputChange}
                    placeholder="e.g. 80"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Mile Time</span>
                  </label>
                  <input
                    type="text"
                    name="mile_time"
                    value={formData.mile_time}
                    onChange={handleInputChange}
                    placeholder="e.g. 7:30"
                    className="input input-bordered"
                  />
                </div>
              </div>
              <div className="divider">Body Metrics</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Weight (kg)</span>
                  </label>
                  <input
                    type="number"
                    name="weight_kg"
                    value={formData.weight_kg}
                    onChange={handleInputChange}
                    placeholder="e.g. 75"
                    className="input input-bordered"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Height (cm)</span>
                  </label>
                  <input
                    type="number"
                    name="height_cm"
                    value={formData.height_cm}
                    onChange={handleInputChange}
                    placeholder="e.g. 175"
                    className="input input-bordered"
                  />
                </div>
              </div>
              <p className="text-sm text-base-content/50 mt-2">
                You can skip this step and add metrics later from your profile.
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
            <p className="text-base-content/70 mb-6">
              Time to start crushing workouts and setting PRs.
            </p>
            <div className="bg-primary/10 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-primary mb-2">Quick Tips:</h3>
              <ul className="space-y-2 text-sm">
                <li>• Check your dashboard daily for today's workouts</li>
                <li>• Log your results immediately after each workout</li>
                <li>• Request AI feedback for personalized coaching tips</li>
                <li>• Check the leaderboard to see how you stack up!</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg">
        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-6">
          {ONBOARDING_STEPS.map((step, index) => (
            <li
              key={step.id}
              className={`step ${index <= currentStep ? 'step-primary' : ''}`}
            >
              <span className="hidden sm:inline">{step.title}</span>
            </li>
          ))}
        </ul>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="modal-action">
          {currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
            <button className="btn btn-ghost" onClick={handleBack}>
              Back
            </button>
          )}
          <div className="flex-1" />
          {currentStep < ONBOARDING_STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              {currentStep === ONBOARDING_STEPS.length - 2 ? 'Almost Done' : 'Next'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving...
                </>
              ) : (
                "Let's Go!"
              )}
            </button>
          )}
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" />
    </dialog>
  );
}
