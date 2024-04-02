'use client';
import Metcon from '@/components/Metcon';
import Office from '@/components/Office';
import Whiteboard from '@/components/Whiteboard';
import { useState } from 'react';

export default function CreateGym() {
  const [step, setStep] = useState(0);
  return (
    <div>
      <div className="w-full flex justify-center sticky">
        <ul className="steps">
          <li
            className={`cursor-pointer step px-10 ${
              step >= 0 ? 'step-primary' : ''
            }`}
            onClick={() => setStep(0)}
          >
            Configure Gym
          </li>
          <li
            className={`cursor-pointer step ${step >= 1 ? 'step-primary' : ''}`}
            onClick={() => setStep(1)}
          >
            Customize Workout
          </li>
          <li
            className={`cursor-pointer step ${
              step === 2 ? 'step-primary' : ''
            }`}
            onClick={() => setStep(2)}
          >
            Write Programming
          </li>
        </ul>
      </div>
      {step === 0 && <Office setStep={setStep} />}
      {step === 1 && <Whiteboard setStep={setStep} />}
      {step === 2 && <Metcon />}
    </div>
  );
}
