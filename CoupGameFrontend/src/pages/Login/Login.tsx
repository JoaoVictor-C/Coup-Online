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

const Login: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.username || !form.password) {
      setError(t('auth:login.error.required'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err: any) {
      setError(t('auth:login.error.invalidCredentials'));
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
        {t('auth:login.title')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label={t('auth:login.username')}
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          margin="normal"
          autoFocus
          inputProps={{ 'aria-label': t('auth:login.username') }}
        />
        <TextField
          fullWidth
          label={t('auth:login.password')}
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          margin="normal"
          inputProps={{ 'aria-label': t('auth:login.password') }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ mt: 2, paddingY: 1.5 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : t('auth:login.submit')}
        </Button>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          {t('auth:login.noAccount')}{' '}
          <Link component={RouterLink} to="/register">
            {t('common:buttons.register')}
          </Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;
