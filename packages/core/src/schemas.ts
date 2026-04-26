import { z } from 'zod';

export const Periodization = z.enum(['linear', 'block', 'undulating', 'conjugate']);
export const Units = z.enum(['imperial', 'metric']);

export const ProfileInput = z.object({
  units: Units.default('imperial'),
  gender: z.string().nullable().optional(),
  dob: z.string().date().nullable().optional(),
  timezone: z.string().default('UTC'),
  goals: z.string().max(2000).nullable().optional(),
  injury_history: z.record(z.unknown()).default({}),
  equipment_access: z.array(z.string()).default([]),
  preferred_methodologies: z.array(z.string()).default([]),
  max_lifts: z.record(z.number().nonnegative()).default({}),
  conditioning_metrics: z.record(z.unknown()).default({}),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const CreateProgram = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  methodology: z.string().optional(),
  periodization: Periodization.default('linear'),
  duration_weeks: z.number().int().min(1).max(8),
  days_per_week: z.number().int().min(1).max(7),
  start_date: z.string().date(),
});
export type CreateProgram = z.infer<typeof CreateProgram>;

export const EnhanceWorkout = z.object({
  workout_id: z.string().uuid(),
  enhancement_input: z.string().max(1000).optional(),
});
export type EnhanceWorkout = z.infer<typeof EnhanceWorkout>;

export const ExerciseLogEntry = z.object({
  name: z.string(),
  sets: z.number().int().nullable(),
  reps: z.number().int().nullable(),
  weight: z.number().nullable(),
  rpe: z.number().int().min(1).max(10).optional(),
});

export const LogWorkout = z.object({
  workout_id: z.string().uuid(),
  duration_minutes: z.number().int().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  thumbs: z.enum(['up', 'down']).nullable().optional(),
  notes: z.string().max(2000).optional(),
  substitutions: z
    .array(
      z.object({
        original: z.string(),
        swapped_for: z.string(),
        reason: z.string().optional(),
      })
    )
    .default([]),
  skipped_sections: z.array(z.string()).default([]),
  exercises: z.array(ExerciseLogEntry).default([]),
});
export type LogWorkout = z.infer<typeof LogWorkout>;
