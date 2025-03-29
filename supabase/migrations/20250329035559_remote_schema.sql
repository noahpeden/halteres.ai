drop trigger if exists "update_workout_generations_modtime" on "public"."workout_generations";

drop policy "Users can access workout generations for their programs" on "public"."workout_generations";

revoke delete on table "public"."workout_generations" from "anon";

revoke insert on table "public"."workout_generations" from "anon";

revoke references on table "public"."workout_generations" from "anon";

revoke select on table "public"."workout_generations" from "anon";

revoke trigger on table "public"."workout_generations" from "anon";

revoke truncate on table "public"."workout_generations" from "anon";

revoke update on table "public"."workout_generations" from "anon";

revoke delete on table "public"."workout_generations" from "authenticated";

revoke insert on table "public"."workout_generations" from "authenticated";

revoke references on table "public"."workout_generations" from "authenticated";

revoke select on table "public"."workout_generations" from "authenticated";

revoke trigger on table "public"."workout_generations" from "authenticated";

revoke truncate on table "public"."workout_generations" from "authenticated";

revoke update on table "public"."workout_generations" from "authenticated";

revoke delete on table "public"."workout_generations" from "service_role";

revoke insert on table "public"."workout_generations" from "service_role";

revoke references on table "public"."workout_generations" from "service_role";

revoke select on table "public"."workout_generations" from "service_role";

revoke trigger on table "public"."workout_generations" from "service_role";

revoke truncate on table "public"."workout_generations" from "service_role";

revoke update on table "public"."workout_generations" from "service_role";

alter table "public"."workout_generations" drop constraint "workout_generations_program_id_fkey";

alter table "public"."workout_schedule" drop constraint "workout_schedule_workout_id_fkey";

alter table "public"."workout_generations" drop constraint "workout_generations_pkey";

drop index if exists "public"."idx_workout_generations_program_id";

drop index if exists "public"."workout_generations_pkey";

drop table "public"."workout_generations";

alter table "public"."workout_schedule" add constraint "workout_schedule_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES program_workouts(id) ON DELETE CASCADE not valid;

alter table "public"."workout_schedule" validate constraint "workout_schedule_workout_id_fkey";


