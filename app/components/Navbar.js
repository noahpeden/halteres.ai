import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { styled } from '@emotion/styled';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import img from '../assets/logo.png';

export default function Navbar() {
  const pathname = usePathname();
  const { session, supabase } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AppBar position="fixed" color="secondary">
      <Toolbar>
        <Link href="/">
          <Image src={img} alt="Halteres.ai Logo" height={50} width={50} />
        </Link>
        <Box sx={{ flexGrow: 1 }} />
        {session ? (
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Link href="/login">
            <Button color="inherit">Login</Button>
          </Link>
        )}
      </Toolbar>
    </AppBar>
  );
}
