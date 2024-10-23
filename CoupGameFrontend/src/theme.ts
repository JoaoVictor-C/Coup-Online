import { createTheme } from '@mui/material/styles';

// Improved theme with enhanced color palette, typography, and component overrides for better UX
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0d1b2a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e94560',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#0d1b2a',
      secondary: '#6b7280',
    },
    action: {
      hover: '#e0f7fa',
      selected: '#b2ebf2',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      color: '#0d1b2a',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      color: '#0d1b2a',
    },
    body1: {
      fontSize: '1rem',
      color: '#6b7280',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '12px 24px',
          transition: 'background-color 0.3s ease',
          '&:hover': {
            backgroundColor: '#e94560',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#0d1b2a',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '16px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
    },
  },
});

export default theme;
