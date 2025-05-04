alter type "public"."subscription_plan_enum" rename to "subscription_plan_enum__old_version_to_be_dropped";

create type "public"."subscription_plan_enum" as enum ('monthly', 'quarterly', 'annual', 'daily');

alter table "public"."profiles" alter column subscription_plan type "public"."subscription_plan_enum" using subscription_plan::text::"public"."subscription_plan_enum";

drop type "public"."subscription_plan_enum__old_version_to_be_dropped";

alter table "public"."entities" alter column "bench_1rm" set data type numeric using "bench_1rm"::numeric;

alter table "public"."entities" alter column "deadlift_1rm" set data type numeric using "deadlift_1rm"::numeric;

alter table "public"."entities" alter column "squat_1rm" set data type numeric using "squat_1rm"::numeric;

alter table "public"."profiles" add column "email" text;

set check_function_bodies = off;

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
      CURRENT_TIMESTAMP + INTERVAL '7 days', -- Updated trial duration
      15,
      0
    );
  END IF;
  RETURN NEW;
END;
$function$
;


