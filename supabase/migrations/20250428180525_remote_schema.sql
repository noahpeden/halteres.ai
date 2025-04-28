create type "public"."subscription_plan_enum" as enum ('monthly', 'quarterly', 'annual');

create type "public"."subscription_status_enum" as enum ('trialing', 'active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired');

create table "public"."external_workouts_new" (
    "id" bigint not null,
    "created_at" timestamp with time zone not null default now(),
    "title" text,
    "body" text,
    "embedding" vector(1536),
    "tags" jsonb default '[]'::jsonb,
    "difficulty" text default 'Intermediate'::text
);


alter table "public"."external_workouts_new" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "updated_at" timestamp with time zone,
    "full_name" text,
    "avatar_url" text,
    "stripe_customer_id" text,
    "subscription_status" subscription_status_enum,
    "free_generations_used" integer default 0,
    "stripe_subscription_id" text,
    "stripe_price_id" text,
    "current_period_end" timestamp with time zone,
    "subscription_plan" subscription_plan_enum,
    "trial_start_date" timestamp with time zone,
    "trial_end_date" timestamp with time zone,
    "generations_remaining" integer default 15,
    "generations_today" integer default 0,
    "last_generation_date" date
);


alter table "public"."profiles" enable row level security;

alter table "public"."entities" enable row level security;

alter table "public"."program_workouts" add column "is_reference" boolean default false;

alter table "public"."program_workouts" enable row level security;

alter table "public"."programs" add column "reference_input" text;

alter table "public"."programs" enable row level security;

CREATE UNIQUE INDEX external_workouts_new_pkey ON public.external_workouts_new USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_stripe_customer_id_key ON public.profiles USING btree (stripe_customer_id);

CREATE UNIQUE INDEX profiles_stripe_subscription_id_key ON public.profiles USING btree (stripe_subscription_id);

alter table "public"."external_workouts_new" add constraint "external_workouts_new_pkey" PRIMARY KEY using index "external_workouts_new_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_stripe_customer_id_key" UNIQUE using index "profiles_stripe_customer_id_key";

alter table "public"."profiles" add constraint "profiles_stripe_subscription_id_key" UNIQUE using index "profiles_stripe_subscription_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_match_workouts_embedding_function()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Create the search function for the new table
    CREATE OR REPLACE FUNCTION public.match_workouts_embedding(
        query_embedding vector(1536),
        match_threshold float,
        match_count int
    )
    RETURNS TABLE(
        id bigint,
        title text,
        body text,
        tags jsonb,
        difficulty text,
        similarity float
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
        RETURN QUERY
        SELECT
            w.id,
            w.title,
            w.body,
            w.tags,
            w.difficulty,
            1 - (w.embedding <=> query_embedding) AS similarity
        FROM public.external_workouts_new w
        WHERE 1 - (w.embedding <=> query_embedding) > match_threshold
        ORDER BY w.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $func$;
    
    -- Grant permissions for the search function
    GRANT EXECUTE ON FUNCTION public.match_workouts_embedding(vector(1536), float, int) TO anon;
    GRANT EXECUTE ON FUNCTION public.match_workouts_embedding(vector(1536), float, int) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.match_workouts_embedding(vector(1536), float, int) TO service_role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_workouts_with_single_embedding()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.external_workouts_new (
        id bigint PRIMARY KEY,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        title text,
        body text,
        embedding vector(1536), -- text-embedding-3-large produces 1536-dimensional vectors
        tags jsonb DEFAULT '[]'::jsonb,
        difficulty text DEFAULT 'Intermediate'::text
    );
    
    -- Add comment
    COMMENT ON TABLE public.external_workouts_new IS 'External workouts with single embedding column using text-embedding-3-large';
    COMMENT ON COLUMN public.external_workouts_new.embedding IS 'Text embedding using text-embedding-3-large model';
    
    -- Set permissions
    ALTER TABLE public.external_workouts_new OWNER TO postgres;
    
    -- Enable RLS for security
    ALTER TABLE public.external_workouts_new ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for anonymous access
    DROP POLICY IF EXISTS "Allow anonymous read access to external_workouts_new" ON public.external_workouts_new;
    CREATE POLICY "Allow anonymous read access to external_workouts_new" 
    ON public.external_workouts_new 
    FOR SELECT USING (true);
    
    -- Create policy for insert access
    DROP POLICY IF EXISTS "Allow anonymous insert access to external_workouts_new" ON public.external_workouts_new;
    CREATE POLICY "Allow anonymous insert access to external_workouts_new" 
    ON public.external_workouts_new 
    FOR INSERT WITH CHECK (true);
    
    -- Grant permissions
    GRANT ALL ON TABLE public.external_workouts_new TO anon;
    GRANT ALL ON TABLE public.external_workouts_new TO authenticated;
    GRANT ALL ON TABLE public.external_workouts_new TO service_role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if a profile already exists for the user
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Insert a new row into public.profiles
    INSERT INTO public.profiles (
      id, 
      subscription_status, 
      trial_start_date, 
      trial_end_date, 
      generations_remaining, 
      generations_today
    ) VALUES (
      NEW.id, 
      'trialing', 
      CURRENT_TIMESTAMP, 
      CURRENT_TIMESTAMP + INTERVAL '7 days', 
      15, 
      0
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_similar_workouts_simple(match_threshold double precision, match_count integer, search_query text)
 RETURNS TABLE(id bigint, title text, body text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
declare
  embedding_1 vector(2000);
  embedding_2 vector(2000);
begin
  -- Generate the embedding for the search query
  -- In a real function, you'd generate this from the search_query
  -- For now, we'll use fixed values that match your database structure
  
  SELECT 
    -- Fill with small random values that will match something
    array_fill(0.1, ARRAY[2000])::vector(2000),
    array_fill(0.1, ARRAY[2000])::vector(2000)
  INTO embedding_1, embedding_2;
  
  return query
  select
    ew.id,
    ew.title,
    ew.body,
    1 - (
      (ew.embedding_part1 <=> embedding_1) +
      (ew.embedding_part2 <=> embedding_2)
    ) / 2 as similarity
  from external_workouts ew
  where 1 - (
    (ew.embedding_part1 <=> embedding_1) +
    (ew.embedding_part2 <=> embedding_2)
  ) / 2 > match_threshold
  order by (
    (ew.embedding_part1 <=> embedding_1) +
    (ew.embedding_part2 <=> embedding_2)
  ) / 2 asc
  limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.match_similar_workouts_v2(query_embedding_1 vector, query_embedding_2 vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id bigint, title text, body text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
begin
  return query
  select
    ew.id,
    ew.title,
    ew.body,
    1 - (
      (ew.embedding_part1 <=> query_embedding_1) +
      (ew.embedding_part2 <=> query_embedding_2)
    ) / 2 as similarity
  from external_workouts ew
  where 1 - (
    (ew.embedding_part1 <=> query_embedding_1) +
    (ew.embedding_part2 <=> query_embedding_2)
  ) / 2 > match_threshold
  order by (
    (ew.embedding_part1 <=> query_embedding_1) +
    (ew.embedding_part2 <=> query_embedding_2)
  ) / 2 asc
  limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.match_workouts_embedding(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id bigint, title text, body text, tags jsonb, difficulty text, similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    BEGIN
        RETURN QUERY
        SELECT
            w.id,
            w.title,
            w.body,
            w.tags,
            w.difficulty,
            1 - (w.embedding <=> query_embedding) AS similarity
        FROM public.external_workouts_new w
        WHERE 1 - (w.embedding <=> query_embedding) > match_threshold
        ORDER BY w.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $function$
;

grant delete on table "public"."external_workouts_new" to "anon";

grant insert on table "public"."external_workouts_new" to "anon";

grant references on table "public"."external_workouts_new" to "anon";

grant select on table "public"."external_workouts_new" to "anon";

grant trigger on table "public"."external_workouts_new" to "anon";

grant truncate on table "public"."external_workouts_new" to "anon";

grant update on table "public"."external_workouts_new" to "anon";

grant delete on table "public"."external_workouts_new" to "authenticated";

grant insert on table "public"."external_workouts_new" to "authenticated";

grant references on table "public"."external_workouts_new" to "authenticated";

grant select on table "public"."external_workouts_new" to "authenticated";

grant trigger on table "public"."external_workouts_new" to "authenticated";

grant truncate on table "public"."external_workouts_new" to "authenticated";

grant update on table "public"."external_workouts_new" to "authenticated";

grant delete on table "public"."external_workouts_new" to "service_role";

grant insert on table "public"."external_workouts_new" to "service_role";

grant references on table "public"."external_workouts_new" to "service_role";

grant select on table "public"."external_workouts_new" to "service_role";

grant trigger on table "public"."external_workouts_new" to "service_role";

grant truncate on table "public"."external_workouts_new" to "service_role";

grant update on table "public"."external_workouts_new" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

create policy "Users can delete their own entities"
on "public"."entities"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own entities"
on "public"."entities"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own entities"
on "public"."entities"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own entities"
on "public"."entities"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Allow anonymous insert access to external_workouts_new"
on "public"."external_workouts_new"
as permissive
for insert
to public
with check (true);


create policy "Allow anonymous read access to external_workouts_new"
on "public"."external_workouts_new"
as permissive
for select
to public
using (true);


create policy "Allow individual user read access"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Allow individual user update access"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Allow service_role full access"
on "public"."profiles"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can read their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can delete their program workouts"
on "public"."program_workouts"
as permissive
for delete
to public
using ((program_id IN ( SELECT p.id
   FROM (programs p
     JOIN entities e ON ((p.entity_id = e.id)))
  WHERE (e.user_id = auth.uid()))));


create policy "Users can insert their program workouts"
on "public"."program_workouts"
as permissive
for insert
to public
with check ((program_id IN ( SELECT p.id
   FROM (programs p
     JOIN entities e ON ((p.entity_id = e.id)))
  WHERE (e.user_id = auth.uid()))));


create policy "Users can update their program workouts"
on "public"."program_workouts"
as permissive
for update
to public
using ((program_id IN ( SELECT p.id
   FROM (programs p
     JOIN entities e ON ((p.entity_id = e.id)))
  WHERE (e.user_id = auth.uid()))));


create policy "Users can view their program workouts"
on "public"."program_workouts"
as permissive
for select
to public
using ((program_id IN ( SELECT p.id
   FROM (programs p
     JOIN entities e ON ((p.entity_id = e.id)))
  WHERE (e.user_id = auth.uid()))));



