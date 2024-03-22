import { useState } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import EquipmentSelector from './EquipmentSelector';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  TextareaAutosize,
} from '@mui/material';

export default function Office() {
  const { addOfficeInfo } = useOfficeContext();
  const [equipmentList, setEquipmentList] = useState([]);
  const [coachList, setCoachList] = useState([]);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachExperience, setNewCoachExperience] = useState('');
  const [classSchedule, setClassSchedule] = useState('');
  const [classDuration, setClassDuration] = useState('');
  const [gymName, setGymName] = useState('');

  const handleAddCoach = () => {
    if (newCoachName && newCoachExperience) {
      setCoachList([
        ...coachList,
        { name: newCoachName, experience: newCoachExperience },
      ]);
      setNewCoachName('');
      setNewCoachExperience('');
    }
  };

  const removeCoach = (index) => {
    setCoachList(coachList.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addOfficeInfo({ equipmentList, coachList, classSchedule, classDuration });
  };

  const handleAddEquipmentDetail = (tag) => {
    const isActive = equipmentList.includes(tag);
    isActive
      ? setEquipmentList(equipmentList.filter((item) => item !== tag))
      : setEquipmentList([...equipmentList, tag]);
    console.log(isActive, tag, equipmentList);
  };

  return (
    <Container maxWidth="md" sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 6, fontWeight: 'bold' }}>
        Gym Info
      </Typography>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Gym Name
          </Typography>
          <TextField
            type="text"
            fullWidth
            variant="outlined"
            placeholder="Enter the gym name"
            value={gymName}
            onChange={(e) => setGymName(e.target.value)}
          />
        </section>
        <section>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Add Equipment from your Gym
          </Typography>
          <EquipmentSelector
            selected={equipmentList}
            setSelected={handleAddEquipmentDetail}
          />
        </section>

        <section>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Coaching Staff
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                type="text"
                fullWidth
                variant="outlined"
                placeholder="Coach name"
                value={newCoachName}
                onChange={(e) => setNewCoachName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type="text"
                fullWidth
                variant="outlined"
                placeholder="Experience"
                value={newCoachExperience}
                onChange={(e) => setNewCoachExperience(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="button"
                fullWidth
                variant="contained"
                onClick={handleAddCoach}
              >
                Add Coach
              </Button>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            {coachList.map((coach, index) => (
              <>
                <Grid key={index} item xs={12} sm={6}>
                  <TextField
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={coach.name}
                    readOnly
                  />
                </Grid>
                <Grid key={index} item xs={12} sm={6}>
                  <TextField
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={coach.experience}
                    readOnly
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => removeCoach(index)}
                  >
                    Remove
                  </Button>
                </Grid>
              </>
            ))}
          </Grid>
        </section>
        <section>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Class Schedule
          </Typography>
          <TextareaAutosize
            rowsMin={3}
            fullWidth
            variant="outlined"
            value={classSchedule}
            onChange={(e) => setClassSchedule(e.target.value)}
            placeholder="Enter the class schedule"
          />
        </section>

        <section>
          <Typography variant="h5" sx={{ mb: 4 }}>
            Class Duration
          </Typography>
          <TextField
            type="text"
            fullWidth
            variant="outlined"
            value={classDuration}
            onChange={(e) => setClassDuration(e.target.value)}
            placeholder="Enter the duration for each class"
          />
        </section>

        <Button fullWidth variant="contained" type="submit">
          Save Gym Info
        </Button>
      </form>
    </Container>
  );
}
