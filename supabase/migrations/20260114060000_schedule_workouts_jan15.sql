-- Schedule workouts for January 15, 2026 (browser timezone)
UPDATE program_workouts
SET scheduled_date = '2026-01-15T12:00:00.000Z'
WHERE id IN (
    SELECT id FROM program_workouts
    WHERE gym_id = 'dff82999-92b2-41f1-bd9d-2126b932da21'
    AND (scheduled_date IS NULL OR scheduled_date::date = '2026-01-14')
    LIMIT 5
);
