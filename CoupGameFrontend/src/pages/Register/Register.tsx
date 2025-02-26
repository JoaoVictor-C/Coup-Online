// Enhanced Register page with improved form validation, accessibility, and user feedback
import React, { useEffect, useState } from 'react';
import useAuth from '@hooks/useAuth';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Box,
  Link,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const Register: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError(t('auth:register.error.required'));
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('auth:register.error.passwordMismatch'));
      return false;
    }
    // Additional validations (e.g., email format, password strength) can be added here
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/login');
    } catch (err: any) {
      console.error('Register error:', err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message;

      if (errorMessage?.includes('Username already exists') ||
        err.response?.status === 400 && err.response?.data?.username === form.username) {
        setError(t('auth:register.error.userExists'));
      } else if (errorMessage?.includes('Email already exists') ||
        err.response?.status === 400 && err.response?.data?.email === form.email) {
        setError(t('auth:register.error.emailExists'));
      } else {
        setError(t('common:error.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  // If logged return to home:
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/');
    }
  }, [isLoggedIn, navigate]);

  return (
    <Container maxWidth="sm" sx={{ my: 5 }}>
      <Typography variant="h4" gutterBottom align="center">
        {t('auth:register.title')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label={t('auth:register.username')}
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          margin="normal"
          autoFocus
          inputProps={{ 'aria-label': t('auth:register.username') }}
        />
        <TextField
          fullWidth
          label={t('auth:register.email')}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          margin="normal"
          inputProps={{ 'aria-label': t('auth:register.email') }}
        />
        <TextField
          fullWidth
          label={t('auth:register.password')}
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          margin="normal"
          inputProps={{ 'aria-label': t('auth:register.password') }}
        />
        <TextField
          fullWidth
          label={t('auth:register.confirmPassword')}
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
          margin="normal"
          inputProps={{ 'aria-label': t('auth:register.confirmPassword') }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 2, paddingY: 1.5 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t('auth:register.submit')}
        </Button>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          {t('auth:register.haveAccount')}{' '}
          <Link component={RouterLink} to="/login">
            {t('common:buttons.login')}
          </Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default Register;
