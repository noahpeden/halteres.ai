'use client';

import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { useState } from 'react';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Profile' },
  { id: 'metrics', title: 'Metrics' },
  { id: 'complete', title: 'Ready' },
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
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--athlete-accent-primary)] to-[var(--athlete-accent-secondary)] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--athlete-accent-primary)]/30">
              <Dumbbell className="w-10 h-10 text-black" />
            </div>
            <h2 className="athlete-heading-xl mb-2">Welcome to the yard</h2>
            <p className="athlete-body text-[var(--athlete-text-secondary)] mb-8">
              A few marks in the book so programs can meet you where you are.
            </p>

            <div className="athlete-card-static p-5 text-left">
              <h3 className="athlete-heading-md mb-4">What you can do</h3>
              <ul className="space-y-3">
                {[
                  { icon: Activity, text: "See today's session at a glance" },
                  { icon: Trophy, text: 'Log results and keep PRs' },
                  { icon: Sparkles, text: 'Generate and edit your own program' },
                  { icon: Dumbbell, text: 'Write first — no forced wizard' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--athlete-accent-complete)]/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-[var(--athlete-accent-complete)]" />
                    </div>
                    <span className="athlete-body text-[var(--athlete-text-secondary)]">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--athlete-accent-primary)]/20 flex items-center justify-center">
                <User className="w-6 h-6 text-[var(--athlete-accent-primary)]" />
              </div>
              <div>
                <h2 className="athlete-heading-lg text-[var(--ink)]">Set Up Your Profile</h2>
                <p className="athlete-body text-[var(--athlete-text-secondary)]">
                  How should we call you?
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="athlete-label block mb-2">Display Name</label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="Your name or nickname"
                  className="athlete-input w-full"
                />
                <p className="text-xs text-[var(--athlete-text-muted)] mt-2">
                  This is what others will see on the leaderboard
                </p>
              </div>
            </div>
          </div>
        );

      case 'metrics':
        return (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[var(--athlete-accent-primary)]/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-[var(--athlete-accent-primary)]" />
              </div>
              <div>
                <h2 className="athlete-heading-lg text-[var(--ink)]">Your Baseline Metrics</h2>
                <p className="athlete-body text-[var(--athlete-text-secondary)]">
                  Optional - helps personalize your experience
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Strength Metrics */}
              <div className="athlete-card-static p-4">
                <h3 className="athlete-body text-[var(--ink)] font-medium mb-3">Strength</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="athlete-label block mb-1">Back Squat 1RM</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="squat_1rm"
                        value={formData.squat_1rm}
                        onChange={handleInputChange}
                        placeholder="e.g. 120"
                        className="athlete-input w-full pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                        kg
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Deadlift 1RM</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="deadlift_1rm"
                        value={formData.deadlift_1rm}
                        onChange={handleInputChange}
                        placeholder="e.g. 150"
                        className="athlete-input w-full pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                        kg
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Bench 1RM</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="bench_1rm"
                        value={formData.bench_1rm}
                        onChange={handleInputChange}
                        placeholder="e.g. 80"
                        className="athlete-input w-full pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                        kg
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Mile Time</label>
                    <input
                      type="text"
                      name="mile_time"
                      value={formData.mile_time}
                      onChange={handleInputChange}
                      placeholder="e.g. 7:30"
                      className="athlete-input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Body Metrics */}
              <div className="athlete-card-static p-4">
                <h3 className="athlete-body text-[var(--ink)] font-medium mb-3">Body</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="athlete-label block mb-1">Weight</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="weight_kg"
                        value={formData.weight_kg}
                        onChange={handleInputChange}
                        placeholder="e.g. 75"
                        className="athlete-input w-full pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                        kg
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="athlete-label block mb-1">Height</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="height_cm"
                        value={formData.height_cm}
                        onChange={handleInputChange}
                        placeholder="e.g. 175"
                        className="athlete-input w-full pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--athlete-text-muted)] text-sm">
                        cm
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--athlete-text-muted)]">
                You can skip this and add metrics later from your profile.
              </p>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--athlete-accent-complete)] to-[var(--athlete-accent-primary)] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--athlete-accent-complete)]/30">
              <Check className="w-10 h-10 text-black" />
            </div>
            <h2 className="athlete-heading-xl text-[var(--ink)] mb-2">The book is open.</h2>
            <p className="athlete-body text-[var(--athlete-text-secondary)] mb-8">
              Today is the only page that matters right now.
            </p>

            <div className="athlete-card-static border-l-4 border-l-[var(--athlete-accent-primary)] p-5 text-left">
              <h3 className="athlete-heading-md text-[var(--athlete-accent-primary)] mb-3">
                Keep it simple
              </h3>
              <ul className="space-y-2">
                {[
                  'Open Today when you walk in.',
                  'Log while the chalk is still on your hands.',
                  'Write the next block in Writer — no wizard required.',
                  'Duration is yours. Do not lock it to eight weeks.',
                ].map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--athlete-text-secondary)]"
                  >
                    <span className="text-[var(--athlete-accent-primary)]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg athlete-card-static overflow-hidden">
        {/* Progress Steps */}
        <div className="p-4 border-b border-[var(--athlete-border)]">
          <div className="flex justify-between items-center">
            {ONBOARDING_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    index < currentStep
                      ? 'bg-[var(--athlete-accent-complete)] text-black'
                      : index === currentStep
                        ? 'bg-[var(--athlete-accent-primary)] text-black'
                        : 'bg-[var(--athlete-bg-secondary)] text-[var(--athlete-text-muted)]'
                  }`}
                >
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-1 transition-all ${
                      index < currentStep
                        ? 'bg-[var(--athlete-accent-complete)]'
                        : 'bg-[var(--athlete-bg-secondary)]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">{renderStep()}</div>

        {/* Navigation */}
        <div className="p-4 border-t border-[var(--athlete-border)] flex items-center gap-3">
          {currentStep > 0 && currentStep < ONBOARDING_STEPS.length - 1 && (
            <button
              className="athlete-btn-secondary py-3 px-4 flex items-center gap-2"
              onClick={handleBack}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex-1" />
          {currentStep < ONBOARDING_STEPS.length - 1 ? (
            <button
              className="athlete-btn-primary py-3 px-6 flex items-center gap-2"
              onClick={handleNext}
            >
              {currentStep === ONBOARDING_STEPS.length - 2 ? 'Almost Done' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="athlete-btn-primary py-3 px-6 flex items-center gap-2"
              onClick={handleComplete}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Let's Go!
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
