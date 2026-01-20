-- Test insert a workout result
INSERT INTO workout_results (
    user_id, workout_id, gym_id, result_type, time_seconds, scale, perceived_effort
) VALUES (
    '112d9dc4-f25b-4e45-9372-bb09633566ea', -- Noah's user_id
    '59719b29-cb21-44ea-9532-53a4c687f093', -- workout_id
    'dff82999-92b2-41f1-bd9d-2126b932da21', -- gym_id
    'time',
    930, -- 15:30 = 930 seconds
    'rx',
    7
);
