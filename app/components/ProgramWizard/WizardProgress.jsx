'use client';

export default function WizardProgress({ currentStep }) {
  const steps = [
    { number: 1, title: 'Training Methodology' },
    { number: 2, title: 'Program Description' },
    { number: 3, title: 'Previous Workouts' },
    { number: 4, title: 'Gym Setup' },
    { number: 5, title: 'Your Metrics' },
  ];

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-center mb-8">Programming Wizard</h1>
      <div className="flex justify-between items-center max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  step.number === currentStep
                    ? 'bg-primary text-white'
                    : step.number < currentStep
                      ? 'bg-success text-white'
                      : 'bg-base-300 text-base-content'
                }`}
              >
                {step.number < currentStep ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className="text-sm mt-2 text-center max-w-[100px]">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-1 w-16 mx-2 transition-colors ${
                  step.number < currentStep ? 'bg-success' : 'bg-base-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
