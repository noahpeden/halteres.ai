'use client';
import * as React from 'react';
import { OfficeProvider } from './contexts/OfficeContext';
import { AuthProvider } from './contexts/AuthContext';
import './globals.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';
import Navbar from './components/Navbar';
import { Box } from '@mui/material';

export default function RootLayout(props) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <OfficeProvider>
                <Navbar />

                <Box
                  sx={{
                    paddingTop: '60px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingBottom: '16px',
                  }}
                >
                  {props.children}
                </Box>
              </OfficeProvider>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
