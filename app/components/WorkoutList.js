// components/WorkoutList.js

import { useWorkouts } from '../contexts/WhiteboardContext';

export const WorkoutList = () => {
  const { workouts } = useWorkouts();

  return (
    <div>
      {workouts.map((workout, index) => (
        <p key={index}>{workout}</p>
      ))}
    </div>
  );
};
