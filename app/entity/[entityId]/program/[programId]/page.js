'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import ProgramSchedule from '@/app/components/ProgramSchedule';
import ProgramGeneration from '@/app/components/ProgramGeneration';
import ProgramOverview from '@/app/components/ProgramOverview';
import WorkoutFormat from '@/app/components/WorkoutFormat';
import GymDetails from '@/app/components/GymDetails';

export default function Program({ params }) {
  const { supabase, user } = useAuth();
  const router = useRouter();
  const { entityId, programId } = params;

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    currentWeek: 0,
    totalWeeks: 0,
    currentWorkout: 0,
    totalWorkouts: 0,
  });

  const [program, setProgram] = useState({
    programSchedule: {
      days: [],
      duration_weeks: 4,
    },
    programOverview: {
      name: '',
      description: '',
      duration_weeks: 4,
      focus_area: '',
    },
    workoutFormat: {
      format: 'standard',
    },
    gymDetails: {
      type: 'commercial',
      equipment: [],
    },
    clientMetrics: {
      gender: '',
      height_cm: null,
      weight_kg: null,
      bench_1rm: null,
      squat_1rm: null,
      deadlift_1rm: null,
      mile_time: null,
    },
    generatedProgram: '',
    entity_id: entityId,
  });

  // Fetch program details when component mounts or programId changes
  useEffect(() => {
    if (!programId || !user) return;

    async function fetchProgramDetails() {
      setLoading(true);
      try {
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) throw programError;

        const { data: entityData, error: entityError } = await supabase
          .from('entities')
          .select(
            'gender, height_cm, weight_kg, bench_1rm, squat_1rm, deadlift_1rm, mile_time'
          )
          .eq('id', programData.entity_id)
          .single();

        if (entityError) throw entityError;

        // Parse focus area if it's stored as a JSON string
        let parsedFocusArea = '';
        try {
          if (
            programData.focus_area &&
            typeof programData.focus_area === 'string'
          ) {
            parsedFocusArea = JSON.parse(programData.focus_area);
          } else if (Array.isArray(programData.focus_area)) {
            parsedFocusArea = programData.focus_area;
          }
        } catch (e) {
          console.error('Error parsing focus area:', e);
          parsedFocusArea = programData.focus_area || '';
        }

        // Update program state with fetched data
        setProgram({
          programSchedule: {
            days: programData.session_details?.schedule || [],
            duration_weeks: programData.duration_weeks || 4,
          },
          programOverview: {
            name: programData.name || '',
            description: programData.description || '',
            duration_weeks: programData.duration_weeks || 4,
            focus_area: parsedFocusArea,
          },
          workoutFormat: {
            format: programData.workout_format?.format || 'standard',
          },
          gymDetails: {
            type: programData.gym_details?.type || 'commercial',
            equipment: Array.isArray(programData.gym_details?.equipment)
              ? programData.gym_details.equipment
              : [],
          },
          clientMetrics: {
            gender: entityData.gender || '',
            height_cm: entityData.height_cm,
            weight_kg: entityData.weight_kg,
            bench_1rm: entityData.bench_1rm,
            squat_1rm: entityData.squat_1rm,
            deadlift_1rm: entityData.deadlift_1rm,
            mile_time: entityData.mile_time,
          },
          generatedProgram: programData.generated_program || '',
          entity_id: programData.entity_id || entityId,
        });

        console.log('Program data loaded:', programData);
      } catch (error) {
        console.error('Error fetching program details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProgramDetails();
  }, [programId, user, supabase, entityId]);

  async function saveProgram() {
    if (!programId) return;

    setLoading(true);
    try {
      console.log('Saving program with data:', program);

      const updates = {
        name: program.programOverview.name,
        description: program.programOverview.description,
        duration_weeks: program.programSchedule.duration_weeks,
        focus_area: JSON.stringify(program.programOverview.focus_area || ''),
        session_details: program.programSchedule,
        workout_format: program.workoutFormat,
        gym_details: program.gymDetails,
        generated_program: program.generatedProgram,
      };

      const { error: programError } = await supabase
        .from('programs')
        .update(updates)
        .eq('id', programId);

      if (programError) throw programError;

      // Only update entity metrics if we have an entity_id
      if (program.entity_id) {
        const { error: entityError } = await supabase
          .from('entities')
          .update({
            gender: program.clientMetrics.gender,
            height_cm: program.clientMetrics.height_cm,
            weight_kg: program.clientMetrics.weight_kg,
            bench_1rm: program.clientMetrics.bench_1rm,
            squat_1rm: program.clientMetrics.squat_1rm,
            deadlift_1rm: program.clientMetrics.deadlift_1rm,
            mile_time: program.clientMetrics.mile_time,
          })
          .eq('id', program.entity_id);

        if (entityError) throw entityError;
      }

      console.log('Program and metrics saved successfully');
      alert('Program saved successfully!');
    } catch (error) {
      console.error('Error saving program and metrics:', error);
      alert('Error saving program: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerateProgram = async (generationData) => {
    setIsGenerating(true);
    try {
      // Here you would implement your AI generation logic
      console.log('Generating program with data:', generationData);

      // For now, let's simulate it with a timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const generatedText =
        `Sample generated program based on prompt: ${generationData.prompt}\n\n` +
        `Type: ${generationData.type}\n\n` +
        `Week 1:\n` +
        `- Monday: Upper Body Focus\n` +
        `- Wednesday: Lower Body Focus\n` +
        `- Friday: Full Body Workout\n\n` +
        `Week 2:\n` +
        `- Monday: Push Exercises\n` +
        `- Wednesday: Pull Exercises\n` +
        `- Friday: Legs and Core`;

      setProgram((prev) => ({
        ...prev,
        generatedProgram: generatedText,
      }));

      console.log('Program generated successfully');
    } catch (error) {
      console.error('Error generating program:', error);
      alert('Error generating program: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!entityId || !programId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Invalid program or entity ID</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-24 relative">
      {loading && !isGenerating ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="space-y-6">
          <ProgramOverview
            program={program.programOverview}
            onUpdate={(updatedOverview) =>
              setProgram((prev) => ({
                ...prev,
                programOverview: updatedOverview,
              }))
            }
          />

          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" id="schedule-collapse" />
            <div className="collapse-title text-xl font-medium">
              Program Schedule
            </div>
            <div className="collapse-content">
              <ProgramSchedule
                schedule={program.programSchedule}
                onUpdate={(updatedSchedule) =>
                  setProgram((prev) => ({
                    ...prev,
                    programSchedule: updatedSchedule,
                  }))
                }
              />
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" id="format-collapse" />
            <div className="collapse-title text-xl font-medium">
              Workout Format
            </div>
            <div className="collapse-content">
              <WorkoutFormat
                format={program.workoutFormat.format}
                onUpdate={(updatedFormat) =>
                  setProgram((prev) => ({
                    ...prev,
                    workoutFormat: {
                      ...prev.workoutFormat,
                      format: updatedFormat,
                    },
                  }))
                }
              />
            </div>
          </div>

          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" id="gym-collapse" />
            <div className="collapse-title text-xl font-medium">
              Gym Details
            </div>
            <div className="collapse-content">
              <GymDetails
                details={program.gymDetails}
                onUpdate={(updatedGymDetails) =>
                  setProgram((prev) => ({
                    ...prev,
                    gymDetails: updatedGymDetails,
                  }))
                }
              />
            </div>
          </div>

          <ProgramGeneration
            onGenerate={handleGenerateProgram}
            isGenerating={isGenerating}
          />

          {program.generatedProgram && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">Generated Program</h2>
                <pre className="whitespace-pre-wrap bg-base-200 p-4 rounded-lg text-sm">
                  {program.generatedProgram}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {isGenerating && (
        <div className="fixed top-0 left-0 right-0 bg-warning text-warning-content p-2">
          <p className="text-center">
            {generationProgress.currentWeek > 0
              ? `Generating Week ${generationProgress.currentWeek}/${generationProgress.totalWeeks} - Workout ${generationProgress.currentWorkout}/${generationProgress.totalWorkouts}`
              : 'Generating program...'}
          </p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4">
        <button
          className="btn btn-primary btn-block"
          onClick={saveProgram}
          disabled={loading || isGenerating}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            'Save Program'
          )}
        </button>
      </div>
    </div>
  );
}
