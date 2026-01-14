WARN: no SMS provider is enabled. Disabling phone login
Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          entity_id: string | null
          generated_at: string | null
          id: string
          program_id: string | null
          recommendation_data: Json | null
          recommendation_type: string | null
        }
        Insert: {
          entity_id?: string | null
          generated_at?: string | null
          id?: string
          program_id?: string | null
          recommendation_data?: Json | null
          recommendation_type?: string | null
        }
        Update: {
          entity_id?: string | null
          generated_at?: string | null
          id?: string
          program_id?: string | null
          recommendation_data?: Json | null
          recommendation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_workout_feedback: {
        Row: {
          areas_for_improvement: Json | null
          completion_tokens: number | null
          created_at: string
          id: string
          model_used: string | null
          next_workout_recommendations: Json | null
          performance_analysis: string | null
          prompt_tokens: number | null
          recovery_suggestions: Json | null
          strengths: Json | null
          user_id: string
          workout_result_id: string | null
        }
        Insert: {
          areas_for_improvement?: Json | null
          completion_tokens?: number | null
          created_at?: string
          id?: string
          model_used?: string | null
          next_workout_recommendations?: Json | null
          performance_analysis?: string | null
          prompt_tokens?: number | null
          recovery_suggestions?: Json | null
          strengths?: Json | null
          user_id: string
          workout_result_id?: string | null
        }
        Update: {
          areas_for_improvement?: Json | null
          completion_tokens?: number | null
          created_at?: string
          id?: string
          model_used?: string | null
          next_workout_recommendations?: Json | null
          performance_analysis?: string | null
          prompt_tokens?: number | null
          recovery_suggestions?: Json | null
          strengths?: Json | null
          user_id?: string
          workout_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_workout_feedback_workout_result_id_fkey"
            columns: ["workout_result_id"]
            isOneToOne: false
            referencedRelation: "workout_results"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          age: number | null
          average_age: number | null
          average_experience_years: number | null
          bench_1rm: number | null
          class_duration_minutes: number | null
          class_size: number | null
          created_at: string
          deadlift_1rm: number | null
          deleted_at: string | null
          description: Json | null
          gender: string | null
          has_elite_athletes: boolean | null
          height_cm: number | null
          id: string
          injury_history: Json | null
          mile_time: unknown
          name: string
          preferred_training_days: Json | null
          recovery_score: number | null
          skill_distribution: Json | null
          squat_1rm: number | null
          type: Database["public"]["Enums"]["entity_type"]
          updated_at: string
          user_id: string
          warmup_duration_minutes: number | null
          weight_kg: number | null
          workout_experience_type: string | null
          years_of_experience: number | null
        }
        Insert: {
          age?: number | null
          average_age?: number | null
          average_experience_years?: number | null
          bench_1rm?: number | null
          class_duration_minutes?: number | null
          class_size?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          deleted_at?: string | null
          description?: Json | null
          gender?: string | null
          has_elite_athletes?: boolean | null
          height_cm?: number | null
          id?: string
          injury_history?: Json | null
          mile_time?: unknown
          name: string
          preferred_training_days?: Json | null
          recovery_score?: number | null
          skill_distribution?: Json | null
          squat_1rm?: number | null
          type: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
          user_id?: string
          warmup_duration_minutes?: number | null
          weight_kg?: number | null
          workout_experience_type?: string | null
          years_of_experience?: number | null
        }
        Update: {
          age?: number | null
          average_age?: number | null
          average_experience_years?: number | null
          bench_1rm?: number | null
          class_duration_minutes?: number | null
          class_size?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          deleted_at?: string | null
          description?: Json | null
          gender?: string | null
          has_elite_athletes?: boolean | null
          height_cm?: number | null
          id?: string
          injury_history?: Json | null
          mile_time?: unknown
          name?: string
          preferred_training_days?: Json | null
          recovery_score?: number | null
          skill_distribution?: Json | null
          squat_1rm?: number | null
          type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
          user_id?: string
          warmup_duration_minutes?: number | null
          weight_kg?: number | null
          workout_experience_type?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      external_workouts: {
        Row: {
          body: string | null
          created_at: string
          difficulty: string | null
          embedding_part1: string | null
          embedding_part2: string | null
          id: number
          tags: Json | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          difficulty?: string | null
          embedding_part1?: string | null
          embedding_part2?: string | null
          id?: number
          tags?: Json | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          difficulty?: string | null
          embedding_part1?: string | null
          embedding_part2?: string | null
          id?: number
          tags?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      external_workouts_new: {
        Row: {
          body: string | null
          created_at: string
          difficulty: string | null
          embedding: string | null
          id: number
          tags: Json | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          difficulty?: string | null
          embedding?: string | null
          id: number
          tags?: Json | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          difficulty?: string | null
          embedding?: string | null
          id?: number
          tags?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      gym_memberships: {
        Row: {
          approved_by: string | null
          class_id: string | null
          created_at: string
          gym_id: string
          id: string
          joined_at: string | null
          nickname: string | null
          role: Database["public"]["Enums"]["gym_membership_role"]
          status: Database["public"]["Enums"]["gym_membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          gym_id: string
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: Database["public"]["Enums"]["gym_membership_role"]
          status?: Database["public"]["Enums"]["gym_membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          class_id?: string | null
          created_at?: string
          gym_id?: string
          id?: string
          joined_at?: string | null
          nickname?: string | null
          role?: Database["public"]["Enums"]["gym_membership_role"]
          status?: Database["public"]["Enums"]["gym_membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_memberships_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          invite_code: string | null
          invite_code_expires_at: string | null
          logo_url: string | null
          name: string
          owner_id: string
          require_approval: boolean | null
          state: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          invite_code_expires_at?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          require_approval?: boolean | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          invite_code?: string | null
          invite_code_expires_at?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          require_approval?: boolean | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          category: string
          created_at: string
          custom_name: string | null
          distance_meters: number | null
          id: string
          improvement_percentage: number | null
          notes: string | null
          previous_value: number | null
          reps: number | null
          result_type: Database["public"]["Enums"]["result_type"]
          rounds: number | null
          scale: Database["public"]["Enums"]["result_scale"] | null
          time_seconds: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_result_id: string | null
        }
        Insert: {
          achieved_at?: string
          category: string
          created_at?: string
          custom_name?: string | null
          distance_meters?: number | null
          id?: string
          improvement_percentage?: number | null
          notes?: string | null
          previous_value?: number | null
          reps?: number | null
          result_type: Database["public"]["Enums"]["result_type"]
          rounds?: number | null
          scale?: Database["public"]["Enums"]["result_scale"] | null
          time_seconds?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_result_id?: string | null
        }
        Update: {
          achieved_at?: string
          category?: string
          created_at?: string
          custom_name?: string | null
          distance_meters?: number | null
          id?: string
          improvement_percentage?: number | null
          notes?: string | null
          previous_value?: number | null
          reps?: number | null
          result_type?: Database["public"]["Enums"]["result_type"]
          rounds?: number | null
          scale?: Database["public"]["Enums"]["result_scale"] | null
          time_seconds?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_workout_result_id_fkey"
            columns: ["workout_result_id"]
            isOneToOne: false
            referencedRelation: "workout_results"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bench_1rm: number | null
          current_period_end: string | null
          date_of_birth: string | null
          deadlift_1rm: number | null
          display_name: string | null
          email: string | null
          free_generations_used: number | null
          full_name: string | null
          gender: string | null
          generations_remaining: number | null
          generations_today: number | null
          height_cm: number | null
          id: string
          injury_history: string | null
          is_active: boolean
          last_generation_date: string | null
          mile_time: string | null
          notification_preferences: Json | null
          profile_photo_url: string | null
          recovery_score: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          squat_1rm: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status_enum"]
            | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          bench_1rm?: number | null
          current_period_end?: string | null
          date_of_birth?: string | null
          deadlift_1rm?: number | null
          display_name?: string | null
          email?: string | null
          free_generations_used?: number | null
          full_name?: string | null
          gender?: string | null
          generations_remaining?: number | null
          generations_today?: number | null
          height_cm?: number | null
          id: string
          injury_history?: string | null
          is_active?: boolean
          last_generation_date?: string | null
          mile_time?: string | null
          notification_preferences?: Json | null
          profile_photo_url?: string | null
          recovery_score?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          squat_1rm?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status_enum"]
            | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          bench_1rm?: number | null
          current_period_end?: string | null
          date_of_birth?: string | null
          deadlift_1rm?: number | null
          display_name?: string | null
          email?: string | null
          free_generations_used?: number | null
          full_name?: string | null
          gender?: string | null
          generations_remaining?: number | null
          generations_today?: number | null
          height_cm?: number | null
          id?: string
          injury_history?: string | null
          is_active?: boolean
          last_generation_date?: string | null
          mile_time?: string | null
          notification_preferences?: Json | null
          profile_photo_url?: string | null
          recovery_score?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          squat_1rm?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_enum"]
            | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status_enum"]
            | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      program_workouts: {
        Row: {
          benchmark_name: string | null
          body: string | null
          body_skeleton: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          difficulty: string | null
          entity_id: string | null
          external_workout_id: number | null
          generation_status: string | null
          gym_id: string | null
          id: string
          is_benchmark: boolean | null
          is_reference: boolean | null
          notes: string | null
          program_id: string | null
          scheduled_date: string | null
          tags: Json | null
          title: string
          updated_at: string | null
          week_number: number | null
          workout_type: string | null
        }
        Insert: {
          benchmark_name?: string | null
          body?: string | null
          body_skeleton?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          difficulty?: string | null
          entity_id?: string | null
          external_workout_id?: number | null
          generation_status?: string | null
          gym_id?: string | null
          id?: string
          is_benchmark?: boolean | null
          is_reference?: boolean | null
          notes?: string | null
          program_id?: string | null
          scheduled_date?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
          week_number?: number | null
          workout_type?: string | null
        }
        Update: {
          benchmark_name?: string | null
          body?: string | null
          body_skeleton?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          difficulty?: string | null
          entity_id?: string | null
          external_workout_id?: number | null
          generation_status?: string | null
          gym_id?: string | null
          id?: string
          is_benchmark?: boolean | null
          is_reference?: boolean | null
          notes?: string | null
          program_id?: string | null
          scheduled_date?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
          week_number?: number | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_workouts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_external_workout_id_fkey"
            columns: ["external_workout_id"]
            isOneToOne: false
            referencedRelation: "external_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          calendar_data: Json | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_weeks: number
          entity_id: string
          focus_area: string | null
          generated_program: Json | null
          generation_progress: Json | null
          generation_session_id: string | null
          generation_status: string | null
          goal: string | null
          gym_details: Json | null
          gym_id: string | null
          id: string
          name: string
          periodization: Json | null
          program_overview: Json | null
          reference_input: string | null
          session_details: Json | null
          training_methodology: string | null
          updated_at: string
          workout_format: Json | null
        }
        Insert: {
          calendar_data?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_weeks: number
          entity_id: string
          focus_area?: string | null
          generated_program?: Json | null
          generation_progress?: Json | null
          generation_session_id?: string | null
          generation_status?: string | null
          goal?: string | null
          gym_details?: Json | null
          gym_id?: string | null
          id?: string
          name: string
          periodization?: Json | null
          program_overview?: Json | null
          reference_input?: string | null
          session_details?: Json | null
          training_methodology?: string | null
          updated_at?: string
          workout_format?: Json | null
        }
        Update: {
          calendar_data?: Json | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_weeks?: number
          entity_id?: string
          focus_area?: string | null
          generated_program?: Json | null
          generation_progress?: Json | null
          generation_session_id?: string | null
          generation_status?: string | null
          goal?: string | null
          gym_details?: Json | null
          gym_id?: string | null
          id?: string
          name?: string
          periodization?: Json | null
          program_overview?: Json | null
          reference_input?: string | null
          session_details?: Json | null
          training_methodology?: string | null
          updated_at?: string
          workout_format?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      social_interactions: {
        Row: {
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          parent_comment_id: string | null
          user_id: string
          workout_result_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          parent_comment_id?: string | null
          user_id: string
          workout_result_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          parent_comment_id?: string | null
          user_id?: string
          workout_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_interactions_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "social_interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_interactions_workout_result_id_fkey"
            columns: ["workout_result_id"]
            isOneToOne: false
            referencedRelation: "workout_results"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_results: {
        Row: {
          count: number | null
          created_at: string
          deleted_at: string | null
          gym_id: string | null
          id: string
          include_in_leaderboard: boolean | null
          is_pr: boolean | null
          modifications: string | null
          notes: string | null
          perceived_effort: number | null
          photos: Json | null
          pr_type: string | null
          reps: number | null
          result_type: Database["public"]["Enums"]["result_type"]
          rounds: number | null
          scale: Database["public"]["Enums"]["result_scale"]
          time_seconds: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          deleted_at?: string | null
          gym_id?: string | null
          id?: string
          include_in_leaderboard?: boolean | null
          is_pr?: boolean | null
          modifications?: string | null
          notes?: string | null
          perceived_effort?: number | null
          photos?: Json | null
          pr_type?: string | null
          reps?: number | null
          result_type: Database["public"]["Enums"]["result_type"]
          rounds?: number | null
          scale?: Database["public"]["Enums"]["result_scale"]
          time_seconds?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          count?: number | null
          created_at?: string
          deleted_at?: string | null
          gym_id?: string | null
          id?: string
          include_in_leaderboard?: boolean | null
          is_pr?: boolean | null
          modifications?: string | null
          notes?: string | null
          perceived_effort?: number | null
          photos?: Json | null
          pr_type?: string | null
          reps?: number | null
          result_type?: Database["public"]["Enums"]["result_type"]
          rounds?: number | null
          scale?: Database["public"]["Enums"]["result_scale"]
          time_seconds?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_results_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_results_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_schedule: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          notes: string | null
          program_id: string | null
          scheduled_date: string
          updated_at: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          scheduled_date: string
          updated_at?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          scheduled_date?: string
          updated_at?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_schedule_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_schedule_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_schedule_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "program_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_match_workouts_embedding_function: {
        Args: never
        Returns: undefined
      }
      create_workouts_with_single_embedding: { Args: never; Returns: undefined }
      delete_user_data: { Args: { p_user_id: string }; Returns: undefined }
      generate_invite_code: { Args: { length?: number }; Returns: string }
      get_workout_leaderboard: {
        Args: {
          p_gym_id?: string
          p_limit?: number
          p_scale?: Database["public"]["Enums"]["result_scale"]
          p_workout_id: string
        }
        Returns: {
          created_at: string
          display_name: string
          fist_bump_count: number
          is_pr: boolean
          profile_photo_url: string
          rank: number
          reps: number
          result_type: Database["public"]["Enums"]["result_type"]
          result_value: string
          rounds: number
          scale: Database["public"]["Enums"]["result_scale"]
          time_seconds: number
          user_id: string
          weight_kg: number
        }[]
      }
      match_similar_workouts: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding_1: string
          query_embedding_2: string
        }
        Returns: {
          body: string
          id: number
          similarity: number
          title: string
        }[]
      }
      match_similar_workouts_simple: {
        Args: {
          match_count: number
          match_threshold: number
          search_query: string
        }
        Returns: {
          body: string
          id: number
          similarity: number
          title: string
        }[]
      }
      match_similar_workouts_v2: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding_1: string
          query_embedding_2: string
        }
        Returns: {
          body: string
          id: number
          similarity: number
          title: string
        }[]
      }
      match_workouts_embedding: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          body: string
          difficulty: string
          id: number
          similarity: number
          tags: Json
          title: string
        }[]
      }
    }
    Enums: {
      entity_type: "CLIENT" | "CLASS"
      gym_membership_role: "owner" | "coach" | "athlete"
      gym_membership_status: "pending" | "active" | "suspended" | "left"
      interaction_type: "fist_bump" | "comment"
      result_scale: "rx" | "scaled" | "rx_plus" | "beginner"
      result_type:
        | "time"
        | "rounds_reps"
        | "weight"
        | "reps"
        | "distance"
        | "calories"
      subscription_plan_enum: "monthly" | "quarterly" | "annual" | "daily"
      subscription_status_enum:
        | "trialing"
        | "active"
        | "canceled"
        | "past_due"
        | "incomplete"
        | "incomplete_expired"
      user_role: "coach" | "athlete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entity_type: ["CLIENT", "CLASS"],
      gym_membership_role: ["owner", "coach", "athlete"],
      gym_membership_status: ["pending", "active", "suspended", "left"],
      interaction_type: ["fist_bump", "comment"],
      result_scale: ["rx", "scaled", "rx_plus", "beginner"],
      result_type: [
        "time",
        "rounds_reps",
        "weight",
        "reps",
        "distance",
        "calories",
      ],
      subscription_plan_enum: ["monthly", "quarterly", "annual", "daily"],
      subscription_status_enum: [
        "trialing",
        "active",
        "canceled",
        "past_due",
        "incomplete",
        "incomplete_expired",
      ],
      user_role: ["coach", "athlete"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
