-- Schedule some workouts for today for testing
UPDATE program_workouts
SET scheduled_date = '2026-01-14T12:00:00.000Z'
WHERE id IN (
    SELECT id FROM program_workouts
    WHERE gym_id = 'dff82999-92b2-41f1-bd9d-2126b932da21'
    AND (scheduled_date IS NULL)
    LIMIT 3
);
