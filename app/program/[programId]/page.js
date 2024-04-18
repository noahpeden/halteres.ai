'use client';
import Metcon from '@/components/Metcon';
import Office from '@/components/Office';
import Whiteboard from '@/components/Whiteboard';
import { useState } from 'react';

export default function EditProgram({ params }) {
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
            Customize Program
          </li>
          <li
            className={`cursor-pointer step ${step >= 1 ? 'step-primary' : ''}`}
            onClick={() => setStep(1)}
          >
            Configure Gym
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
      {step === 0 && <Whiteboard setStep={setStep} params={params} />}
      {step === 1 && <Office setStep={setStep} params={params} />}
      {step === 2 && <Metcon params={params} />}
    </div>
  );
}
