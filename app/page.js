'use client';
import {
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import styled from '@emotion/styled';
import Image from 'next/image';
import Link from 'next/link';
import chalk from '@/assets/chalk.jpg'; // Make sure the path is correct
import womanRopes from '@/assets/woman-rope-looking.jpg'; // Make sure the path is correct
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SaveIcon from '@mui/icons-material/Save';

const StyledImage = styled(Image)`
  object-fit: cover;
`;

export default function Page() {
  return (
    <main>
      <Grid container spacing={4} alignItems="center">
        <Grid item xs={12} md={6}>
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            height="100%"
          >
            <Typography variant="h2" gutterBottom component="div">
              Halteres.ai
            </Typography>
            <Typography variant="h5" gutterBottom component="div">
              Automated, smart, and personalized workout programming for gym
              owners, coaches, and personal trainers.
            </Typography>
            <Link href={'/login'} passHref>
              <Button variant="contained" size="large" marginTop={'15px'}>
                Get Started
              </Button>
            </Link>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <StyledImage
            src={womanRopes}
            alt="Fitness enthusiast"
            width={800}
            height={600}
          />
        </Grid>
        <Grid container spacing={3} marginTop={'10px'}>
          <Grid item xs={4}>
            <Card sx={{ height: '125px' }}>
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                height="100%"
              >
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <FitnessCenterIcon sx={{ marginRight: '10px' }} />
                    <Typography variant="h6" component="div">
                      Gym Personalization
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Tailor workouts to your gym's equipment and class schedule.
                  </Typography>
                </CardContent>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ height: '125px' }}>
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                height="100%"
              >
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon sx={{ marginRight: '10px' }} />
                    <Typography variant="h6" component="div">
                      Accurate Workout Programming
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Leverage our database of 1000s of exercises and upload your
                    own to create hyper accurate and unique programs for
                    classes, individuals, or yourself!
                  </Typography>
                </CardContent>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ height: '125px' }}>
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                height="100%"
              >
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <SaveIcon sx={{ marginRight: '10px' }} />
                    <Typography variant="h6" component="div">
                      Save Time
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Auto generate your programming and save hours of time each
                    week.
                  </Typography>
                </CardContent>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </main>
  );
}
