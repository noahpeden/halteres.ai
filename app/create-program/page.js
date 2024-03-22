'use client';

import Metcon from '@/components/Metcon';
import Office from '@/components/Office';
import Whiteboard from '@/components/Whiteboard';
import Box from '@mui/material/Box';

export default function CreateProgram() {
  return (
    <Box>
      <Office />
      <Whiteboard />
      <Metcon />
    </Box>
  );
}
