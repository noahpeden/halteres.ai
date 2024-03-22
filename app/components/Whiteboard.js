import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  TextField,
  Button,
  TextareaAutosize,
} from '@mui/material';

export default function WhiteboardPage() {
  // const router = useRouter();
  const { addWhiteboardInfo, setReadyForQuery } = useOfficeContext();
  const [workoutFormat, setWorkoutFormat] = useState(
    'Crossfit Classes: Warmup, Strength, Metcon, Cool Down, Mobility | Olympic Lifting: Warmup, Strength, Cool Down'
  );
  const [cycleLength, setCycleLength] = useState('Crossfit Classes: 1 week');
  const [focus, setFocus] = useState('Squat, Deadlift, Bench, outside cardio');
  const [exampleWorkout, setExampleWorkout] = useState(
    "7 sets for load: 6 alternating front-rack reverse lunges (3/leg) Post heaviest load to comments. Scaling: Each set in today’s workout is meant to be heavy relative to each athlete's ability. Adjust the load as needed to maintain proper form and mechanics across all 7 sets. Intermediate option: Same as Rx’d Beginner option: Same as Rx’d"
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    addWhiteboardInfo({ cycleLength, workoutFormat, focus, exampleWorkout });
    setReadyForQuery(true);
    // router.push('/'); // Redirect to home page after submission
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Whiteboard Information
      </Typography>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="my-4">
          <Typography variant="h5">Workout Format</Typography>
          <TextareaAutosize
            rowsMin={3}
            fullWidth
            variant="outlined"
            value={workoutFormat}
            onChange={(e) => setWorkoutFormat(e.target.value)}
          />
        </div>

        <div className="my-4">
          <Typography variant="h5">Cycle Length</Typography>
          <TextareaAutosize
            rowsMin={3}
            fullWidth
            variant="outlined"
            value={cycleLength}
            onChange={(e) => setCycleLength(e.target.value)}
          />
        </div>

        <div className="my-4">
          <Typography variant="h5">Focuses</Typography>
          <TextareaAutosize
            rowsMin={3}
            fullWidth
            variant="outlined"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
          />
        </div>

        <div className="my-4">
          <Typography variant="h5">Template Workouts</Typography>
          <TextareaAutosize
            rowsMin={3}
            fullWidth
            variant="outlined"
            value={exampleWorkout}
            onChange={(e) => setExampleWorkout(e.target.value)}
          />
        </div>

        <Button fullWidth variant="contained" color="primary" type="submit">
          Save
        </Button>
      </form>
    </Container>
  );
}
