export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_recommendations: {
        Row: {
          entity_id: string | null;
          generated_at: string | null;
          id: string;
          program_id: string | null;
          recommendation_data: Json | null;
          recommendation_type: string | null;
        };
        Insert: {
          entity_id?: string | null;
          generated_at?: string | null;
          id?: string;
          program_id?: string | null;
          recommendation_data?: Json | null;
          recommendation_type?: string | null;
        };
        Update: {
          entity_id?: string | null;
          generated_at?: string | null;
          id?: string;
          program_id?: string | null;
          recommendation_data?: Json | null;
          recommendation_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_recommendations_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_recommendations_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      entities: {
        Row: {
          age: number | null;
          bench_1rm: number | null;
          created_at: string;
          deadlift_1rm: number | null;
          description: Json | null;
          gender: string | null;
          height_cm: number | null;
          id: string;
          injury_history: Json | null;
          mile_time: unknown | null;
          name: string;
          preferred_training_days: Json | null;
          recovery_score: number | null;
          squat_1rm: number | null;
          type: Database['public']['Enums']['entity_type'];
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
          workout_experience_type: string | null;
          years_of_experience: number | null;
        };
        Insert: {
          age?: number | null;
          bench_1rm?: number | null;
          created_at?: string;
          deadlift_1rm?: number | null;
          description?: Json | null;
          gender?: string | null;
          height_cm?: number | null;
          id?: string;
          injury_history?: Json | null;
          mile_time?: unknown | null;
          name: string;
          preferred_training_days?: Json | null;
          recovery_score?: number | null;
          squat_1rm?: number | null;
          type: Database['public']['Enums']['entity_type'];
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
          workout_experience_type?: string | null;
          years_of_experience?: number | null;
        };
        Update: {
          age?: number | null;
          bench_1rm?: number | null;
          created_at?: string;
          deadlift_1rm?: number | null;
          description?: Json | null;
          gender?: string | null;
          height_cm?: number | null;
          id?: string;
          injury_history?: Json | null;
          mile_time?: unknown | null;
          name?: string;
          preferred_training_days?: Json | null;
          recovery_score?: number | null;
          squat_1rm?: number | null;
          type?: Database['public']['Enums']['entity_type'];
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
          workout_experience_type?: string | null;
          years_of_experience?: number | null;
        };
        Relationships: [];
      };
      external_workouts: {
        Row: {
          body: string | null;
          created_at: string;
          difficulty: string | null;
          embedding_part1: string | null;
          embedding_part2: string | null;
          id: number;
          tags: Json | null;
          title: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          difficulty?: string | null;
          embedding_part1?: string | null;
          embedding_part2?: string | null;
          id?: number;
          tags?: Json | null;
          title?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          difficulty?: string | null;
          embedding_part1?: string | null;
          embedding_part2?: string | null;
          id?: number;
          tags?: Json | null;
          title?: string | null;
        };
        Relationships: [];
      };
      external_workouts_new: {
        Row: {
          body: string | null;
          created_at: string;
          difficulty: string | null;
          embedding: string | null;
          id: number;
          tags: Json | null;
          title: string | null;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          difficulty?: string | null;
          embedding?: string | null;
          id: number;
          tags?: Json | null;
          title?: string | null;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          difficulty?: string | null;
          embedding?: string | null;
          id?: number;
          tags?: Json | null;
          title?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          current_period_end: string | null;
          email: string | null;
          free_generations_used: number | null;
          full_name: string | null;
          generations_remaining: number | null;
          generations_today: number | null;
          id: string;
          is_active: boolean;
          last_generation_date: string | null;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          subscription_plan: Database['public']['Enums']['subscription_plan_enum'] | null;
          subscription_status: Database['public']['Enums']['subscription_status_enum'] | null;
          trial_end_date: string | null;
          trial_start_date: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          current_period_end?: string | null;
          email?: string | null;
          free_generations_used?: number | null;
          full_name?: string | null;
          generations_remaining?: number | null;
          generations_today?: number | null;
          id: string;
          is_active?: boolean;
          last_generation_date?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: Database['public']['Enums']['subscription_plan_enum'] | null;
          subscription_status?: Database['public']['Enums']['subscription_status_enum'] | null;
          trial_end_date?: string | null;
          trial_start_date?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          current_period_end?: string | null;
          email?: string | null;
          free_generations_used?: number | null;
          full_name?: string | null;
          generations_remaining?: number | null;
          generations_today?: number | null;
          id?: string;
          is_active?: boolean;
          last_generation_date?: string | null;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: Database['public']['Enums']['subscription_plan_enum'] | null;
          subscription_status?: Database['public']['Enums']['subscription_status_enum'] | null;
          trial_end_date?: string | null;
          trial_start_date?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      program_workouts: {
        Row: {
          body: string | null;
          completed: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          difficulty: string | null;
          entity_id: string | null;
          external_workout_id: number | null;
          id: string;
          is_reference: boolean | null;
          notes: string | null;
          program_id: string | null;
          scheduled_date: string | null;
          tags: Json | null;
          title: string;
          updated_at: string | null;
          workout_type: string | null;
        };
        Insert: {
          body?: string | null;
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          difficulty?: string | null;
          entity_id?: string | null;
          external_workout_id?: number | null;
          id?: string;
          is_reference?: boolean | null;
          notes?: string | null;
          program_id?: string | null;
          scheduled_date?: string | null;
          tags?: Json | null;
          title: string;
          updated_at?: string | null;
          workout_type?: string | null;
        };
        Update: {
          body?: string | null;
          completed?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          difficulty?: string | null;
          entity_id?: string | null;
          external_workout_id?: number | null;
          id?: string;
          is_reference?: boolean | null;
          notes?: string | null;
          program_id?: string | null;
          scheduled_date?: string | null;
          tags?: Json | null;
          title?: string;
          updated_at?: string | null;
          workout_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'program_workouts_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_workouts_external_workout_id_fkey';
            columns: ['external_workout_id'];
            isOneToOne: false;
            referencedRelation: 'external_workouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_workouts_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      programs: {
        Row: {
          calendar_data: Json | null;
          created_at: string;
          description: string | null;
          difficulty: string | null;
          duration_weeks: number;
          entity_id: string;
          focus_area: string | null;
          generated_program: Json | null;
          goal: string | null;
          gym_details: Json | null;
          id: string;
          name: string;
          periodization: Json | null;
          program_overview: Json | null;
          reference_input: string | null;
          session_details: Json | null;
          training_methodology: string | null;
          updated_at: string;
          workout_format: Json | null;
        };
        Insert: {
          calendar_data?: Json | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          duration_weeks: number;
          entity_id: string;
          focus_area?: string | null;
          generated_program?: Json | null;
          goal?: string | null;
          gym_details?: Json | null;
          id?: string;
          name: string;
          periodization?: Json | null;
          program_overview?: Json | null;
          reference_input?: string | null;
          session_details?: Json | null;
          training_methodology?: string | null;
          updated_at?: string;
          workout_format?: Json | null;
        };
        Update: {
          calendar_data?: Json | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          duration_weeks?: number;
          entity_id?: string;
          focus_area?: string | null;
          generated_program?: Json | null;
          goal?: string | null;
          gym_details?: Json | null;
          id?: string;
          name?: string;
          periodization?: Json | null;
          program_overview?: Json | null;
          reference_input?: string | null;
          session_details?: Json | null;
          training_methodology?: string | null;
          updated_at?: string;
          workout_format?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'programs_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_schedule: {
        Row: {
          created_at: string | null;
          entity_id: string | null;
          id: string;
          notes: string | null;
          program_id: string | null;
          scheduled_date: string;
          updated_at: string | null;
          workout_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          entity_id?: string | null;
          id?: string;
          notes?: string | null;
          program_id?: string | null;
          scheduled_date: string;
          updated_at?: string | null;
          workout_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          entity_id?: string | null;
          id?: string;
          notes?: string | null;
          program_id?: string | null;
          scheduled_date?: string;
          updated_at?: string | null;
          workout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_schedule_entity_id_fkey';
            columns: ['entity_id'];
            isOneToOne: false;
            referencedRelation: 'entities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_schedule_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_schedule_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'program_workouts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      binary_quantize: {
        Args: { '': string } | { '': unknown };
        Returns: unknown;
      };
      create_match_workouts_embedding_function: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_workouts_with_single_embedding: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      delete_user_data: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      halfvec_avg: {
        Args: { '': number[] };
        Returns: unknown;
      };
      halfvec_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      halfvec_send: {
        Args: { '': unknown };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
      hnsw_bit_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      hnswhandler: {
        Args: { '': unknown };
        Returns: unknown;
      };
      ivfflat_bit_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: { '': unknown };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: { '': unknown };
        Returns: unknown;
      };
      l2_norm: {
        Args: { '': unknown } | { '': unknown };
        Returns: number;
      };
      l2_normalize: {
        Args: { '': string } | { '': unknown } | { '': unknown };
        Returns: string;
      };
      match_similar_workouts: {
        Args: {
          query_embedding_1: string;
          query_embedding_2: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: number;
          title: string;
          body: string;
          similarity: number;
        }[];
      };
      match_similar_workouts_simple: {
        Args: {
          match_threshold: number;
          match_count: number;
          search_query: string;
        };
        Returns: {
          id: number;
          title: string;
          body: string;
          similarity: number;
        }[];
      };
      match_similar_workouts_v2: {
        Args: {
          query_embedding_1: string;
          query_embedding_2: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: number;
          title: string;
          body: string;
          similarity: number;
        }[];
      };
      match_workouts_embedding: {
        Args: {
          query_embedding: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: number;
          title: string;
          body: string;
          tags: Json;
          difficulty: string;
          similarity: number;
        }[];
      };
      sparsevec_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: { '': unknown };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
      vector_avg: {
        Args: { '': number[] };
        Returns: string;
      };
      vector_dims: {
        Args: { '': string } | { '': unknown };
        Returns: number;
      };
      vector_norm: {
        Args: { '': string };
        Returns: number;
      };
      vector_out: {
        Args: { '': string };
        Returns: unknown;
      };
      vector_send: {
        Args: { '': string };
        Returns: string;
      };
      vector_typmod_in: {
        Args: { '': unknown[] };
        Returns: number;
      };
    };
    Enums: {
      entity_type: 'CLIENT' | 'CLASS';
      subscription_plan_enum: 'monthly' | 'quarterly' | 'annual' | 'daily';
      subscription_status_enum:
        | 'trialing'
        | 'active'
        | 'canceled'
        | 'past_due'
        | 'incomplete'
        | 'incomplete_expired';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json };
        Returns: undefined;
      };
      extension: {
        Args: { name: string };
        Returns: string;
      };
      filename: {
        Args: { name: string };
        Returns: string;
      };
      foldername: {
        Args: { name: string };
        Returns: string[];
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          prefix_param: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
        };
        Returns: {
          key: string;
          id: string;
          created_at: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          prefix_param: string;
          delimiter_param: string;
          max_keys?: number;
          start_after?: string;
          next_token?: string;
        };
        Returns: {
          name: string;
          id: string;
          metadata: Json;
          updated_at: string;
        }[];
      };
      operation: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      search: {
        Args: {
          prefix: string;
          bucketname: string;
          limits?: number;
          levels?: number;
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entity_type: ['CLIENT', 'CLASS'],
      subscription_plan_enum: ['monthly', 'quarterly', 'annual', 'daily'],
      subscription_status_enum: [
        'trialing',
        'active',
        'canceled',
        'past_due',
        'incomplete',
        'incomplete_expired',
      ],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
