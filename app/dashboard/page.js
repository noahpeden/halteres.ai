'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  Container,
  Button,
  TextField,
  Typography,
  Grid,
  Card,
  CardActionArea,
} from '@mui/material';

export default function Programs() {
  const { user, supabase } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [programName, setProgramName] = useState('');
  const [gym, setGym] = useState('');
  const [whiteboard, setWhiteboard] = useState('');
  const [gyms, setGyms] = useState([]);
  const [whiteboards, setWhiteboards] = useState([]);

  async function fetchPrograms() {
    let { data, error } = await supabase.from('programs').select('*');
    setPrograms(data);
  }

  async function fetchGyms() {
    let { data, error } = await supabase.from('gyms').select('*');
    setGyms(data);
  }

  async function fetchWhiteboards() {
    let { data, error } = await supabase.from('whiteboards').select('*');
    setWhiteboards(data);
  }

  useEffect(() => {
    fetchWhiteboards();
    fetchGyms();
    fetchPrograms();
  }, []);

  async function createEntity(event, entityName) {
    event.preventDefault();
    if (user) {
      const { data, error } = await supabase
        .from(entityName)
        .insert([{ name: programName, user_id: user.id }]);
      console.log({ data, error });
    }
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" align="center" my={4}>
        <Link href="/create-program" passHref>
          <Button variant="contained" size="large">
            Create brand new programming
          </Button>
        </Link>
      </Typography>
      <Typography variant="h5" gutterBottom>
        Programs
      </Typography>

      <Grid container spacing={2}>
        {programs.map((program) => (
          <Grid item key={program.program_id} xs={12} sm={6} md={4}>
            <Card>
              <CardActionArea>
                <Typography variant="body1" component="div">
                  <Link href={`/programs/${program.program_id}`} passHref>
                    <Button variant="text" fullWidth>
                      {program.name}
                    </Button>
                  </Link>
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Repeat the above structure for Gyms and Whiteboards */}
      <Grid container spacing={2}>
        {gyms?.map((gym) => (
          <Grid item key={gym.gym_id} xs={12} sm={6} md={4}>
            <Card>
              <CardActionArea>
                <Typography variant="body1" component="div">
                  <Link href={`/gyms/${gym.gym_id}`} passHref>
                    <Button variant="text" fullWidth>
                      {gym.name}
                    </Button>
                  </Link>
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        {whiteboards?.map((whiteboard) => (
          <Grid item key={whiteboard.whiteboard_id} xs={12} sm={6} md={4}>
            <Card>
              <CardActionArea>
                <Typography variant="body1" component="div">
                  <Link
                    href={`/whiteboards/${whiteboard.whiteboard_id}`}
                    passHref
                  >
                    <Button variant="text" fullWidth>
                      {whiteboard.name}
                    </Button>
                  </Link>
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
