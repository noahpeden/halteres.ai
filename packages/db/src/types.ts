// Hand-rolled types for the schema. Replace with `pnpm db:types` output once
// the Supabase project is live and the generator can introspect the DB.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Profile {
  user_id: string;
  units: 'imperial' | 'metric';
  gender: string | null;
  dob: string | null;
  timezone: string;
  goals: string | null;
  injury_history: Record<string, unknown>;
  equipment_access: string[];
  preferred_methodologies: string[];
  max_lifts: Record<string, number>;
  conditioning_metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type Periodization = 'linear' | 'block' | 'undulating' | 'conjugate';
export type ProgramStatus = 'pending' | 'skeleton' | 'detailed' | 'archived' | 'failed';

export interface Program {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  methodology: string | null;
  periodization: Periodization;
  duration_weeks: number;
  days_per_week: number;
  start_date: string;
  generation_status: ProgramStatus;
  created_at: string;
  updated_at: string;
}

export type WorkoutStatus = 'skeleton' | 'enhancing' | 'detailed' | 'failed';

export interface Workout {
  id: string;
  program_id: string;
  user_id: string;
  week_number: number;
  day_index: number;
  scheduled_date: string;
  title: string;
  body_skeleton: string | null;
  body_detailed: string | null;
  enhancement_input: string | null;
  enhanced_at: string | null;
  generation_status: WorkoutStatus;
  created_at: string;
  updated_at: string;
}

export interface ExerciseLog {
  name: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  rpe?: number;
}

export interface WorkoutLog {
  id: string;
  workout_id: string;
  user_id: string;
  completed_at: string;
  duration_minutes: number | null;
  rpe: number | null;
  thumbs: 'up' | 'down' | null;
  notes: string | null;
  substitutions: { original: string; swapped_for: string; reason?: string }[];
  skipped_sections: string[];
  exercises: ExerciseLog[];
  created_at: string;
}

export interface WorkoutEmbedding {
  workout_id: string;
  user_id: string;
  embedding: number[];
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type GenerationKind = 'skeleton' | 'enhance' | 'embed';

export interface GenerationRun {
  id: string;
  user_id: string;
  program_id: string | null;
  workout_id: string | null;
  kind: GenerationKind;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cached_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

// Return type of the match_workouts RPC
export interface MatchedWorkout {
  workout_id: string;
  similarity: number;
  summary: string;
  metadata: Record<string, unknown>;
  log: Omit<WorkoutLog, 'id' | 'workout_id' | 'user_id'> | null;
}
