'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProgramCalendar from '@/components/ProgramCalendar';
import WorkoutSelection from '@/components/WorkoutSelection';
import ClientMetricsSidebar from '@/components/ClientMetricsSidebar';
import Link from 'next/link';

export default function ProgramCalendarPage({ params }) {
  const { programId } = params;
  const { supabase } = useAuth();
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    async function fetchProgram() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .eq('program_id', programId)
          .single();

        if (error) throw error;
        setProgram(data);
      } catch (error) {
        console.error('Error fetching program:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgram();
  }, [programId, supabase]);

  const handleSelectWorkout = (workout) => {
    // This function will be called when a workout is selected from WorkoutSelection
    // You can implement drag-and-drop functionality or other interactions here
    console.log('Selected workout:', workout);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {program?.name || 'Program Calendar'}
            </h1>
            <p className="text-gray-600">
              {program?.description || 'Manage your program schedule'}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/program/${programId}/workouts`}
              className="btn btn-outline btn-sm"
            >
              Workouts
            </Link>
            <Link
              href={`/program/${programId}/metrics`}
              className="btn btn-outline btn-sm"
            >
              Metrics
            </Link>
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'calendar' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`tab ${activeTab === 'workouts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('workouts')}
        >
          Find Workouts
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {activeTab === 'calendar' ? (
            <ProgramCalendar programId={programId} />
          ) : (
            <WorkoutSelection
              programId={programId}
              onSelectWorkout={handleSelectWorkout}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <ClientMetricsSidebar programId={programId} />
        </div>
      </div>
    </div>
  );
}
