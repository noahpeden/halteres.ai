'use client';
import { use } from 'react';
import AIWorkoutReferencer from '@/components/AIWorkoutReferencer';

export default function ProgramWorkoutsPage(props) {
  const params = use(props.params);
  const { programId } = params;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Workout Referencer</h1>
        <p className="text-practical-gray">
          Reference and manage workout details.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <AIWorkoutReferencer programId={programId} />
      </div>
    </div>
  );
}
