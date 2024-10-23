import React, { useState } from 'react';
import useAuth from '@hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err: any) {
      setError(t('auth:login.error'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="my-5">
      <h2>{t('auth:login.title')}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="username" className="mb-3">
          <Form.Label>{t('auth:login.username')}</Form.Label>
          <Form.Control 
            type="text" 
            name="username" 
            value={form.username} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Form.Group controlId="password" className="mb-3">
          <Form.Label>{t('auth:login.password')}</Form.Label>
          <Form.Control 
            type="password" 
            name="password" 
            value={form.password} 
            onChange={handleChange} 
            required 
          />
        </Form.Group>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
          ) : (
            t('auth:login.submit')
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default Login;